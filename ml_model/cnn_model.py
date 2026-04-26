import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import os
import sys

# Add current directory to path to allow direct execution
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from preprocess import get_dataloaders
except ImportError:
    from .preprocess import get_dataloaders

class SARLeakCNN(nn.Module):
    def __init__(self, in_channels=1, num_outputs=15):
        super(SARLeakCNN, self).__init__()
        
        # Feature extraction
        self.features = nn.Sequential(
            # Layer 1: 1 -> 32 channels
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Layer 2: 32 -> 64 channels
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Layer 3: 64 -> 128 channels
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Layer 4: 128 -> 256 channels
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)) # Global Average Pooling
        )
        
        # Regression block for 10 coordinate values (5 pairs of x,y)
        self.regressor = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(128, num_outputs)
        )

    def forward(self, x):
        x = self.features(x)
        x = torch.flatten(x, 1)
        x = self.regressor(x)
        return x

def train_model(model, train_loader, val_loader, num_epochs=20, learning_rate=0.001, device='cpu'):
    # Mean Squared Error Loss for regression task
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    model.to(device)
    
    print(f"Starting training on {device}...")
    
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            
            # Forward pass
            outputs = model(images)
            loss = criterion(outputs, targets)
            
            # Backward and optimize
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            
        epoch_loss = running_loss / len(train_loader.dataset)
        
        # Validation
        val_loss = evaluate_model(model, val_loader, criterion, device)
        
        print(f"Epoch [{epoch+1}/{num_epochs}] - "
              f"Train MSE Loss: {epoch_loss:.4f} | "
              f"Val MSE Loss: {val_loss:.4f}")

    print("Training finished!")
    return model

def evaluate_model(model, test_loader, criterion=None, device='cpu'):
    if criterion is None:
        criterion = nn.MSELoss()
        
    model.eval()
    running_loss = 0.0
    
    with torch.no_grad():
        for images, targets in test_loader:
            images, targets = images.to(device), targets.to(device)
            outputs = model(images)
            loss = criterion(outputs, targets)
            
            running_loss += loss.item() * images.size(0)
            
    avg_loss = running_loss / len(test_loader.dataset)
    return avg_loss

if __name__ == "__main__":
    # Parameters
    BATCH_SIZE = 4
    EPOCHS = 10
    LR = 0.0001
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load data
    try:
        train_loader, test_loader = get_dataloaders(dataset_dir='dataset', batch_size=BATCH_SIZE)
        
        if train_loader is not None:
            # Initialize model predicting 10 continuous values from a single 1-channel image
            model = SARLeakCNN(in_channels=1, num_outputs=10)
            
            # Train
            train_model(model, train_loader, test_loader, num_epochs=EPOCHS, learning_rate=LR, device=DEVICE)
            
            # Save model
            os.makedirs('ml_model/saved_models', exist_ok=True)
            torch.save(model.state_dict(), 'ml_model/saved_models/sar_leak_cnn_regressor.pth')
            print("Model saved to ml_model/saved_models/sar_leak_cnn_regressor.pth")
        else:
            print("Failed to load dataloaders.")
            
    except Exception as e:
        print(f"Error in training script: {e}")
