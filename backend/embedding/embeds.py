import sys
print(sys.executable)
import torch
import clip
import umap.umap_
import numpy as np
import time
import joblib
from tqdm import tqdm
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, Subset
torch.manual_seed(42)
np.random.seed(42)

# Load model and data
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])
cifar_dataset = datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
subset_indices = list(range(1000))  # First 1000 images
subset_dataset = Subset(cifar_dataset, subset_indices)
data_loader = DataLoader(subset_dataset, batch_size=32, shuffle=False)

def extract_features(data_loader, model, device):
    all_features = []
    print("Starting feature extraction...")
    start_time = time.time()
    
    with torch.no_grad():
        for images, _ in tqdm(data_loader, desc="Extracting Features"):
            images = images.to(device)
            features = model.encode_image(images)
            features /= features.norm(dim=-1, keepdim=True)
            all_features.append(features.cpu())
    
    total_time = time.time() - start_time
    print(f"Feature extraction completed in {total_time:.2f} seconds.")
    
    return torch.cat(all_features).numpy()

def train_umap(data, n_components=2, n_epochs=200, random_state=42):
    print(f"Training UMAP ({n_components}D) with {n_epochs} epochs...")
    model = umap.UMAP(n_components=n_components, n_epochs=n_epochs, random_state=random_state)
    embeddings = model.fit_transform(data)
    return model, embeddings

embeddings = extract_features(data_loader, model, device)
umap_model_2d, reduced_vectors_2d = train_umap(embeddings, n_components=2)
umap_model_3d, reduced_vectors_3d = train_umap(embeddings, n_components=3)

# Saving
np.savez("clip_data.npz", embeddings=embeddings, reduced_2d=reduced_vectors_2d, reduced_3d=reduced_vectors_3d)
joblib.dump(umap_model_2d, "umap_model_2d.joblib")
joblib.dump(umap_model_3d, "umap_model_3d.joblib")

print("Saved CLIP embeddings, UMAP reduced vectors, and UMAP models.")

# Retrieving
def load_data():
    data = np.load("clip_data.npz")
    umap_model_2d = joblib.load("umap_model_2d.joblib")
    umap_model_3d = joblib.load("umap_model_3d.joblib")
    return data["embeddings"], data["reduced_2d"], data["reduced_3d"], umap_model_2d, umap_model_3d

if __name__ == "__main__":
    embeddings, reduced_vectors_2d, reduced_vectors_3d, umap_model_2d, umap_model_3d = load_data()
    print("Loaded data successfully.")