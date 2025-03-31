import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import torch
import clip
from torchvision import transforms, datasets
from torch.utils.data import DataLoader, Subset
import cloudinary.uploader
from PIL import Image
import io

cloudinary.config( 
    cloud_name = "da6uctgwu", 
    api_key = "262255287698265", 
    api_secret = "iEIKJ80IsBU-flH_zZvU8xJxZVc",
    secure=True
)

transform = transforms.Compose([
    transforms.Resize((224, 224)), 
    transforms.ToTensor()
])

cifar_dataset = datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
subset_indices = list(range(1000)) 
subset_dataset = Subset(cifar_dataset, subset_indices)
data_loader = DataLoader(subset_dataset, batch_size=32, shuffle=False)


image_urls = []

for i, (images, labels) in enumerate(data_loader):
    for j in range(images.shape[0]):
        img_tensor = images[j]
        img_pil = transforms.ToPILImage()(img_tensor)
        img_bytes = io.BytesIO()
        img_pil.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        response = cloudinary.uploader.upload(img_bytes, folder="cifar10_dataset/")
        image_urls.append(response["secure_url"])

    print(f"Uploaded batch {i+1}/{len(data_loader)}")

# Save URLs
with open("image_urls.txt", "w") as f:
    for url in image_urls:
        f.write(url + "\n")

print("All images uploaded")