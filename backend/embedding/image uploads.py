import os
import cloudinary
import cloudinary.uploader
import psycopg2
from torchvision import transforms
from torch.utils.data import DataLoader, Dataset
from PIL import Image

cloudinary.config(
    cloud_name="da6uctgwu",
    api_key="262255287698265",
    api_secret="iEIKJ80IsBU-flH_zZvU8xJxZVc",
    secure=True
)

# Database connection
conn = psycopg2.connect(
    dbname="photoGRAPH",
    user="postgres",
    password="", ######INSERT PASSWORD
    host="localhost",
    port="5432"
)
cur = conn.cursor()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

class CustomImageDataset(Dataset):
    def __init__(self, image_dir, transform=None):
        self.image_dir = image_dir
        self.transform = transform
        self.image_names = os.listdir(image_dir)
        
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

cur.execute("SELECT dataset_id FROM dataset WHERE dataset_name = 'example_dataset'")
dataset_id = cur.fetchone()[0]

def upload_image_to_cloudinary(local_path, image_name):
    """Uploads an image to Cloudinary and returns the URL."""
    try:
        response = cloudinary.uploader.upload(local_path, folder="cifar10_dataset")
        return response.get('secure_url')
    except Exception as e:
        print(f"Error uploading {image_name}: {e}")
        return None

for i, (images, labels) in enumerate(data_loader):
    for j in range(images.shape[0]):
        image_name = labels[j]  # Get original image filename
        local_path = os.path.join(LOCAL_IMAGE_DIR, image_name)

        cloudinary_url = upload_image_to_cloudinary(local_path, image_name)

        if cloudinary_url:
            cur.execute(
                """
                UPDATE image SET image_urls = ARRAY[%s] 
                WHERE image_name = %s AND dataset_id = %s
                """,
                (cloudinary_url, image_name, dataset_id)
            )
            print(f"✅ Database updated: {image_name} → {cloudinary_url}")
        else:
            print(f"⚠️ Failed to upload {image_name}.")

    print(f"🔄 Processed batch {i+1}/{len(data_loader)}.")

conn.commit()
cur.close()
conn.close()
print("🎉 All images uploaded to Cloudinary and database updated!")