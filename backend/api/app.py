from flask import Flask, request, jsonify
import torch
from torchvision import transforms
from PIL import Image
from sklearn.decomposition import PCA
import clip
import numpy as np
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from flask_cors import CORS
import supabase
import json

print("Supabase version:", supabase.__version__)

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Supabase configuration using environment variables
SUPABASE_URL = os.environ.get("REACT_APP_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("REACT_APP_SUPABASE_ANON_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase URL or Key in environment variables.")

# Create Supabase client instance
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
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

##############################
#  Endpoint 1: Extract CLIP Embeddings
##############################
@app.route('/extract-clip-embeddings', methods=['POST'])
def extract_clip_embeddings():
    try:
        # Ensure at least one file is provided.
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        # Retrieve all files (supports multiple image upload)
        files = request.files.getlist('file')
        if not files or len(files) == 0:
            return jsonify({"error": "No files provided"}), 400

        # Use a preprocessing transform (or use the 'preprocess' provided by CLIP)
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            # Add normalization if your model requires it.
        ])

        results = []
        for file in files:
            # Open image and convert to RGB (ensuring 3 channels)
            img = Image.open(file.stream).convert("RGB")
            img_tensor = transform(img).unsqueeze(0)  # shape: (1, 3, 224, 224)
            clip_emb = get_clip_embedding(img_tensor)  # Expected shape: (1,512)
            
            results.append({
                "filename": file.filename,
                "clip_embedding": clip_emb[0].tolist()  # 1D array of length 512
            })
        return jsonify(results), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

##############################
#  Endpoint 2: Extract PCA Embeddings
##############################
@app.route('/extract-pca-embeddings', methods=['POST'])
def extract_pca_embeddings():
    try:
        # Retrieve all clip embeddings from the database.
        response = supabase.table("clip_embeddings").select("data_point_id, embedding").execute()
        clip_data = response.data
        if not clip_data:
            return jsonify({"error": "No clip embeddings found"}), 404

        # Build a list of embeddings.
        clip_embeddings = []
        for record in clip_data:
            emb_val = record["embedding"]
            if isinstance(emb_val, str):
                emb_list = json.loads(emb_val)
            else:
                emb_list = emb_val
            clip_embeddings.append(emb_list)

        clip_embeddings = np.array(clip_embeddings, dtype=float)  # Expected shape: (N, 512)
        num_samples = clip_embeddings.shape[0]
        n_components = 50 if num_samples >= 50 else num_samples

        pca = PCA(n_components=n_components)
        pca_embeddings = pca.fit_transform(clip_embeddings)
        
        results = []
        for i, record in enumerate(clip_data):
            results.append({
                "data_point_id": record["data_point_id"],
                "pca_embedding": pca_embeddings[i].tolist()
            })
        
        return jsonify(results), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/retrieve-pca-with-details', methods=['GET'])
def retrieve_pca_with_details():
    try:
        # Require the project_id as a query parameter.
        project_id = request.args.get("project_id")
        response = supabase.table("pca_embeddings")\
            .select("data_point_id, embedding, data_points(label, image_url, project_id)")\
            .eq("data_points.project_id", project_id)\
            .execute()
        pca_data = response.data
        if not pca_data:
            return jsonify({"error": "No PCA embeddings found"}), 404

        # Log for debugging
        print("Retrieved PCA embeddings for project", project_id, ":", pca_data)

        return jsonify(pca_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/query', methods=['POST'])
def query():
    try:
        # Parse input based on content type:
        if request.content_type.startswith("application/json"):
            req = request.get_json()
            query_type = req.get("type")
            project_id = req.get("project_id")
        else:
            query_type = request.form.get("type")
            project_id = request.form.get("project_id")

        # Ensure project_id is provided.
        if not project_id:
            return jsonify({"error": "project_id is required"}), 400
        
        # Parse top_k (default to 5)
        let_top_k = 5  # default
        if query_type == "text":
            let_top_k = int(req.get("top_k", 5))
        elif query_type == "image":
            let_top_k = int(request.form.get("top_k", 5))
        else:
            return jsonify({"error": "Invalid query type"}), 400

        # Compute query embedding based on query type
        if query_type == "text":
            query_text = req.get("text")
            if not query_text:
                return jsonify({"error": "No query text provided"}), 400
            query_embedding = get_clip_text_embedding(query_text).flatten()  # shape (512,)
        elif query_type == "image":
            if "file" not in request.files:
                return jsonify({"error": "No image file provided"}), 400
            file = request.files.get("file")
            image = Image.open(file.stream).convert("RGB")
            # Use clip_preprocess to prepare the image.
            image_tensor = preprocess(image).unsqueeze(0)  # shape (1, 3, 224, 224)
            query_embedding = get_clip_embedding(image_tensor).flatten()
        else:
            return jsonify({"error": "Invalid query type"}), 400

        # Retrieve all data_point IDs for the given project.
        dp_resp_project = supabase.table("data_points")\
            .select("id")\
            .eq("project_id", project_id)\
            .execute()
        valid_dp_ids = [dp["id"] for dp in dp_resp_project.data] if dp_resp_project.data else []
        if not valid_dp_ids:
            return jsonify({"error": "No data points found for this project"}), 404
        
        # Retrieve stored CLIP embeddings from the "clip_embeddings" table
        clip_resp = supabase.table("clip_embeddings")\
            .select("data_point_id, embedding")\
            .in_("data_point_id", valid_dp_ids)\
            .execute()
        stored_data = clip_resp.data
        if not stored_data or len(stored_data) == 0:
            return jsonify({"error": "No stored embeddings found for this project"}), 404

        # Parse stored embeddings and keep their corresponding data_point_id
        stored_embeddings = []
        data_point_ids = []
        for record in stored_data:
            emb_val = record["embedding"]
            if isinstance(emb_val, str):
                emb_val = json.loads(emb_val)
            stored_embeddings.append(emb_val)
            data_point_ids.append(record["data_point_id"])
        stored_embeddings = np.array(stored_embeddings, dtype=float)  # shape (N, 512)

        # Compute cosine similarities between the query embedding and all stored embeddings
        similarities = np.array([cosine_similarity(query_embedding, stored_embeddings[i])
                                  for i in range(len(stored_embeddings))])
        # Get indices of the top_k highest similarities
        top_indices = similarities.argsort()[::-1][:let_top_k]
        top_ids = [data_point_ids[i] for i in top_indices]
        top_similarities = similarities[top_indices]

        # Retrieve corresponding rows from the data_points table
        dp_resp = supabase.table("data_points")\
            .select("id, label, image_url")\
            .in_("id", top_ids)\
            .execute()
        dp_data = dp_resp.data
        if not dp_data:
            return jsonify({"error": "No corresponding data points found"}), 404

        # Build a dictionary mapping data point id to its row data
        dp_map = {d["id"]: d for d in dp_data}

        # Create query results
        query_results = []
        for i, dp_id in enumerate(top_ids):
            dp = dp_map.get(dp_id)
            if not dp:
                continue
            query_results.append({
                "data_point_id": dp_id,
                "label": dp.get("label"),
                "image_url": dp.get("image_url"),
                "similarity": float(top_similarities[i])
            })

        return jsonify(query_results), 200

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