import os
import torch
import numpy as np
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from sklearn.model_selection import train_test_split

class WaterLeakDataset(Dataset):
    def __init__(self, image_data, transform=None, sar_scaling=False):
        """
        Args:
            image_data (list of dicts): Contains 'path' (str) and 'targets' (list of floats).
            transform (callable, optional): Optional transform to be applied on a sample.
            sar_scaling (bool): If true, applies log scaling (10*log10) to images.
        """
        self.image_data = image_data
        self.transform = transform
        self.sar_scaling = sar_scaling

    def __len__(self):
        return len(self.image_data)

    def _preprocess_image(self, path):
        """Loads and optionally scales single SAR/Index images."""
        try:
            img = Image.open(path).convert('L') # Single channel intensity
            img_np = np.array(img).astype(np.float32)
            
            if self.sar_scaling:
                # Assuming SAR backscatter (linear), convert to Decibels
                img_np = 10.0 * np.log10(np.clip(img_np, 1e-6, None))
            
            # Normalize to [0, 1] for CNN if not already
            if not self.sar_scaling:
                img_np /= 255.0
                
            return Image.fromarray(img_np)
        except Exception as e:
            print(f"Error loading image {path}: {e}")
            return Image.new('L', (224, 224), 0)

    def __getitem__(self, idx):
        data = self.image_data[idx]
        img_path = data['path']
        targets = data['targets']

        img = self._preprocess_image(img_path)
                
        if self.transform:
            img_tensor = self.transform(img)
        else:
            img_tensor = transforms.ToTensor()(img)
        
        # Returns [1, H, W] for grayscale images and the 10 target coordinates
        return img_tensor, torch.tensor(targets, dtype=torch.float32)

def gather_dataset_files(base_dir):
    """Gathers individual image paths, generating 10 mock coordinates per image."""
    leakage_base = os.path.join(base_dir, 'leakage_places_images')
    non_leakage_base = os.path.join(base_dir, 'non_leakage')

    tasks = []
    if os.path.exists(leakage_base):
        for folder in os.listdir(leakage_base):
            path = os.path.join(leakage_base, folder)
            if os.path.isdir(path):
                tasks.append((path, folder, 1))
                
    if os.path.exists(non_leakage_base):
        for folder in os.listdir(non_leakage_base):
            path = os.path.join(non_leakage_base, folder)
            if os.path.isdir(path):
                tasks.append((path, folder, 0))

    image_data = []
    for folder_path, location_name, label in tasks:
        files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        for f in files:
            img_path = os.path.join(folder_path, f)
            
            # Mock targets for the 10 coordinates (5 points x,y)
            if label == 1:
                mock_targets = np.random.rand(10).tolist()
            else:
                mock_targets = [0.0] * 10

            image_data.append({
                'location': location_name,
                'path': img_path,
                'label': label,
                'targets': mock_targets
            })

    return image_data

def get_dataloaders(dataset_dir='dataset', batch_size=4, test_size=0.2, img_size=(224, 224)):
    """Creates PyTorch DataLoaders for single images."""
    
    if not os.path.exists(dataset_dir):
        if os.path.exists('../dataset'):
            dataset_dir = '../dataset'
        else:
            raise FileNotFoundError(f"Dataset directory '{dataset_dir}' not found.")

    image_data = gather_dataset_files(dataset_dir)
    print(f"Total valid individual images found: {len(image_data)}")
    
    if len(image_data) == 0:
        return None, None

    labels = [d['label'] for d in image_data]
    try:
        train_data, test_data = train_test_split(image_data, test_size=test_size, stratify=labels, random_state=42)
    except:
        train_data, test_data = train_test_split(image_data, test_size=test_size, random_state=42)

    train_transform = transforms.Compose([
        transforms.Resize(img_size),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    test_transform = transforms.Compose([
        transforms.Resize(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    train_dataset = WaterLeakDataset(train_data, transform=train_transform)
    test_dataset = WaterLeakDataset(test_data, transform=test_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    return train_loader, test_loader

if __name__ == "__main__":
    tl, v_l = get_dataloaders()
    if tl:
        for imgs, tgts in tl:
            print(f"Batch shape: {imgs.shape}")
            print(f"Targets shape: {tgts.shape}")
            break
