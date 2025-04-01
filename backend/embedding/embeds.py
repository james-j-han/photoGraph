import os
import time
import joblib
import torch
import clip
import umap
import numpy as np
import psycopg2
from tqdm import tqdm
from torchvision import transforms
from torch.utils.data import DataLoader, Dataset
from PIL import Image

torch.manual_seed(42)
np.random.seed(42)

# Load model and data
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

umap_2d = umap.UMAP(n_components=2, random_state=42)
umap_3d = umap.UMAP(n_components=3, random_state=42)

class CustomImageDataset(Dataset):
    def __init__(self, image_dir, transform=None):
        self.image_dir = image_dir
        self.transform = transform
        self.image_names = [f for f in os.listdir(image_dir) if f.lower().endswith(('png', 'jpg', 'jpeg'))]

    def __len__(self):
        return len(self.image_names)

    def __getitem__(self, idx):
        img_name = self.image_names[idx]
        img_path = os.path.join(self.image_dir, img_name)
        image = Image.open(img_path).convert("RGB")

        if self.transform:
            image = self.transform(image)
        
        return image, img_name

LOCAL_IMAGE_DIR = "./saved_images"

image_dataset = CustomImageDataset(LOCAL_IMAGE_DIR, transform)
data_loader = DataLoader(image_dataset, batch_size=32, shuffle=False)

conn = psycopg2.connect(
    dbname="photoGRAPH",
    user="postgres",
    password="", ######INSERT PASSWORD
    host="localhost",
    port="5432"
)
cur = conn.cursor()
cur.execute("SELECT dataset_id FROM dataset WHERE dataset_name = 'example_dataset'")
dataset_id = cur.fetchone()[0]

all_clip_embeddings = []
image_names = []

def extract_features(data_loader, model, device):
    all_features = []
    all_image_names = []
    print("Starting feature extraction...")
    start_time = time.time()
    
    with torch.no_grad():
        for images, labels in tqdm(data_loader, desc="Extracting Features"):
            images = images.to(device)
            features = model.encode_image(images)
            features /= features.norm(dim=-1, keepdim=True)
            all_features.append(features.cpu().numpy())
            all_image_names.extend(labels)
    
    total_time = time.time() - start_time
    print(f"Feature extraction completed in {total_time:.2f} seconds.")
    
    return np.vstack(all_features), all_image_names

def train_umap(data, n_components=2, n_epochs=200, random_state=42):
    print(f"Training UMAP ({n_components}D) with {n_epochs} epochs...")
    model = umap.UMAP(n_components=n_components, n_epochs=n_epochs, random_state=random_state)
    embeddings = model.fit_transform(data)
    return model, embeddings

clip_embeddings, image_names = extract_features(data_loader, model, device)
umap_model_2d, reduced_vectors_2d = train_umap(clip_embeddings, n_components=2)
umap_model_3d, reduced_vectors_3d = train_umap(clip_embeddings, n_components=3)

# Uploading

for i, (clip_embed, umap2d, umap3d) in enumerate(zip(clip_embeddings, reduced_vectors_2d, reduced_vectors_3d)):
    image_name = image_names[i]
    local_path = os.path.join(LOCAL_IMAGE_DIR, image_name)

    cur.execute(
        """
        INSERT INTO image (image_name, image_urls, dataset_id, clip_vector_embedding, umap_2d, umap_3d, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        RETURNING image_id
        """,
        (image_name, [local_path], dataset_id, clip_embed.tolist(), umap2d.tolist(), umap3d.tolist())
    )

conn.commit()
cur.close()
conn.close()

print("Everything is uploaded to database")
