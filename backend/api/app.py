from flask import Flask, request, jsonify
import torch
# from torchvision import transforms
from PIL import Image
from sklearn.decomposition import PCA, IncrementalPCA
from pca_utils import load_pca_model, save_pca_model
import clip
import numpy as np
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from flask_cors import CORS
import supabase
import json
import time
import io
import requests

print("Supabase version:", supabase.__version__)

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── supabase client setup ───────────────────────────────────────
SUPABASE_URL = os.environ.get("REACT_APP_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("REACT_APP_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load CLIP model and preprocessing pipeline.
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Helper function to extract CLIP embeddings.
def get_clip_embedding(img_tensor):
    with torch.no_grad():
        embedding = model.encode_image(img_tensor.to(device))
        embedding /= embedding.norm(dim=-1, keepdim=True)
    return embedding.cpu().numpy()  # Expected shape: (1, 512)

# Helper unction to extract CLIP text embedding
def get_clip_text_embedding(text):
    with torch.no_grad():
        text_tokens = clip.tokenize([text]).to(device)
        embedding = model.encode_text(text_tokens)
        embedding /= embedding.norm(dim=-1, keepdim=True)
    return embedding.cpu().numpy()  # shape (1, 512)

# Helper function to compute cosine similarity between two vectors
def cosine_similarity(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

@app.route("/embed-and-pca-batch", methods=["POST"])
def embed_and_pca_batch():
    try:
        payload    = request.get_json(force=True)
        project_id = payload.get("project_id")
        items      = payload.get("items", [])

        if not project_id or not items:
            return jsonify(error="project_id and items are required"), 400

        # 1) For each item: fetch its image, run CLIP, upsert clip_embeddings
        new_embeddings = []
        for it in items:
            dp_id     = it.get("data_point_id")
            image_url = it.get("image_url")
            if not dp_id or not image_url:
                continue

            try:
                resp = requests.get(image_url, timeout=10)
                resp.raise_for_status()
                img = Image.open(io.BytesIO(resp.content)).convert("RGB")

                tensor   = preprocess(img).unsqueeze(0)
                clip_vec = get_clip_embedding(tensor)[0].tolist()

                # upsert into clip_embeddings
                supabase.table("clip_embeddings") \
                        .upsert({
                            "data_point_id": dp_id,
                            "embedding":     clip_vec
                        }) \
                        .execute()

                new_embeddings.append(clip_vec)
            except Exception as e:
                app.logger.error(f"CLIP step failed for {image_url}: {e}")
                continue

        # 2) Load existing IncrementalPCA (or None)
        ipca = load_pca_model(project_id)

        # 3) Fetch _all_ CLIP embeddings for this project
        resp     = supabase.table("clip_embeddings") \
                           .select("data_point_id, embedding, data_points!inner(project_id)") \
                           .eq("data_points.project_id", project_id) \
                           .execute()
        all_recs = resp.data or []

        # 4) Build a numpy array of every embedding
        all_vecs = []
        for rec in all_recs:
            emb = rec["embedding"]
            if isinstance(emb, str):
                emb = json.loads(emb)
            all_vecs.append(emb)
        all_arr     = np.array(all_vecs, dtype=float)
        num_samples = all_arr.shape[0]

        # 5) (Re)fit or update the IPCA
        if num_samples > 0:
            if ipca is None:
                # first time: pick at most 50 components
                n_comp = min(num_samples, 3)
                ipca   = IncrementalPCA(n_components=n_comp)
                ipca.fit(all_arr)
            else:
                if new_embeddings:
                    new_arr = np.array(new_embeddings, dtype=float)
                    ipca.partial_fit(new_arr)

            # 6) persist the updated model
            save_pca_model(project_id, ipca)

            # 7) re‑transform _all_ embeddings
            coords = ipca.transform(all_arr)
            # 8) upsert into pca_embeddings
            for rec, coord in zip(all_recs, coords):
                supabase.table("pca_embeddings") \
                        .upsert({
                            "data_point_id": rec["data_point_id"],
                            "embedding":     coord.tolist()
                        }) \
                        .execute()

        return jsonify(success=True, processed=len(new_embeddings)), 200

    except Exception as e:
        app.logger.exception("embed-and-pca-batch failed")
        return jsonify(error=str(e)), 500

@app.route('/retrieve-pca-with-details', methods=['GET'])
def retrieve_pca_with_details():
    try:
        # Require the project_id as a query parameter.
        project_id = request.args.get("project_id")
        response = supabase.table("pca_embeddings")\
            .select("data_point_id, embedding, data_points!inner(label, image_url, project_id)")\
            .eq("data_points.project_id", project_id)\
            .execute()
        pca_data = response.data
        if not pca_data:
            return jsonify([]), 200

        # Log for debugging
        print("Retrieved PCA embeddings for project", project_id, ":", pca_data)

        return jsonify(pca_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/query', methods=['POST'])
def query():
    try:
        # 1) Parse inputs
        if request.content_type.startswith("application/json"):
            req = request.get_json()
            query_type = req.get("type")
            project_id = req.get("project_id")
            top_k = int(req.get("top_k", 5))
        else:
            project_id = request.form.get("project_id")
            query_type = request.form.get("type")
            top_k = int(request.form.get("top_k", 5))

        if not project_id:
            return jsonify({"error": "project_id is required"}), 400
        if query_type not in ("text", "image"):
            return jsonify({"error": "Invalid query type"}), 400

        # 2) Build the query embedding
        if query_type == "text":
            text = req.get("text")
            if not text:
                return jsonify({"error": "No text provided"}), 400
            query_emb = get_clip_text_embedding(text).flatten()
        else:
            if "file" not in request.files:
                return jsonify({"error": "No image file provided"}), 400
            img = Image.open(request.files["file"].stream).convert("RGB")
            tensor = preprocess(img).unsqueeze(0)
            query_emb = get_clip_embedding(tensor).flatten()

        # 3) Fetch all CLIP embeddings for this project in one go
        clip_resp = supabase.table("clip_embeddings") \
            .select("data_point_id, embedding, data_points!inner(label, image_url, project_id)") \
            .eq("data_points.project_id", project_id) \
            .execute()

        records = clip_resp.data or []
        if not records:
            return jsonify({"error": "No embeddings found for this project"}), 404

        # 4) Unpack embeddings + metadata
        embeddings = []
        dp_ids = []
        meta = {}
        for rec in records:
            emb = rec["embedding"]
            if isinstance(emb, str):
                emb = json.loads(emb)
            embeddings.append(emb)
            dp_id = rec["data_point_id"]
            dp_ids.append(dp_id)
            dp = rec["data_points"]
            meta[dp_id] = {
                "label": dp.get("label"),
                "image_url": dp.get("image_url")
            }

        stored = np.array(embeddings, dtype=float)  # shape (N,512)

        # 5) Compute similarities & pick top‑k
        sims = np.array([cosine_similarity(query_emb, stored[i]) for i in range(len(stored))])
        idx   = sims.argsort()[::-1][:top_k]
        top_ids  = [dp_ids[i] for i in idx]
        top_sims = sims[idx]

        # 6) Build results payload
        out = []
        for dp_id, score in zip(top_ids, top_sims):
            info = meta.get(dp_id, {})
            out.append({
                "data_point_id": dp_id,
                "label":        info.get("label"),
                "image_url":    info.get("image_url"),
                "similarity":   float(score)
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

##############################
# Test Index Endpoint
##############################
@app.route('/')
def index():
    return "API is Running"

if __name__ == '__main__':
    app.run(debug=True)