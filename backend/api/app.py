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

        import json

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

@app.route('/retrieve-pca-embeddings', methods=['GET'])
def retrieve_pca_embeddings():
    try:
        response = supabase.table("pca_embeddings").select("data_point_id, embedding, data_points(label)").execute()
        pca_data = response.data
        if not pca_data:
            return jsonify({"error": "No PCA embeddings found"}), 404
        
        print("Retrieved PCA embeddings:", pca_data)
        
        return jsonify(pca_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

##############################
# Test Index Endpoint
##############################
@app.route('/')
def index():
    return "Image Embedding and Reconstruction API"

if __name__ == '__main__':
    app.run(debug=True)