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

load_dotenv()  # Load variables from your .env file

app = Flask(__name__)
CORS(app)  # Enable CORS

# Supabase configuration using environment variables
SUPABASE_URL = os.environ.get("REACT_APP_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("REACT_APP_SUPABASE_ANON_KEY")

# Ensure the variables are correctly loaded
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
        # Compute the embedding using the CLIP model.
        embedding = model.encode_image(img_tensor.to(device))
        # Normalize the embedding.
        embedding /= embedding.norm(dim=-1, keepdim=True)
    return embedding.cpu().numpy()

@app.route('/extract-embeddings', methods=['POST'])
def extract_embeddings():
    try:
        # Get the image file from the request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        img = Image.open(file.stream)

        # Preprocess the image as needed
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            # ... other normalization transforms
        ])
        img_tensor = transform(img).unsqueeze(0)  # add batch dimension

        # Extract CLIP embedding using your model
        clip_embedding = get_clip_embedding(img_tensor)  # Returns a high-dimensional NumPy array

        # Reduce dimensions using PCA (this is an example; in practice, PCA may be pre-fitted)
        pca = PCA(n_components=50)
        # Note: You likely want to fit PCA on your entire dataset offline
        pca_embedding = pca.fit_transform(clip_embedding.reshape(1, -1))  # shape (1,50)

        return jsonify({
            "clip_embedding": clip_embedding.tolist(),
            "pca_embedding": pca_embedding.tolist()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# @app.route('/register', methods=['POST'])
# def register():
#     data = request.get_json()
#     auth_id = data.get('auth_id')
#     first_name = data.get('first_name')
#     last_name = data.get('last_name')
    
#     if not auth_id or not first_name or not last_name:
#         return jsonify({'error': 'Missing required fields'}), 400
    
#     # Check if user exists
#     existing_user = supabase.table('users').select("*").eq('id', auth_id).execute()
#     if existing_user.data:  # If there's already a record
#         return jsonify({'error': 'User already registered'}), 409

#     # Insert new user into the 'users' table
#     response = supabase.table('users').insert({
#         'id': auth_id,
#         'first_name': first_name,
#         'last_name': last_name
#     }).execute()

#     # Handle response without status codes
#     if not response.data:
#         return jsonify({
#             'error': 'Insertion failed',
#             'details': 'No data returned in the response.'
#         }), 400
    
#     return jsonify({
#         'message': 'User registered successfully',
#         'data': response.data
#     }), 201

@app.route('/')
def index():
    response = supabase.table('users').select("*").execute()
    return jsonify(response.data)

if __name__ == '__main__':
    app.run(debug=True)