"""
AI Training Script for PQC Hole Classification
Uses MobileNetV2 (transfer learning) to classify camera images into:
  - threaded_hole
  - plain_hole
  - background

Requires: PyTorch with CUDA, torchvision
Training data: dataset/threaded/, dataset/plain/, dataset/background/
Output: models/best_model.pth
"""
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models
import time
import json

# ==========================================
# CONFIGURATION
# ==========================================
DATASET_DIR = "dataset"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "best_model.pth")
META_PATH = os.path.join(MODEL_DIR, "model_meta.json")

BATCH_SIZE = 16
NUM_EPOCHS = 25
LEARNING_RATE = 0.001
IMAGE_SIZE = 224
TRAIN_SPLIT = 0.8  # 80% train, 20% validation

# ==========================================
# DATA TRANSFORMS
# ==========================================
# Training: with augmentation for robustness
train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(30),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
    transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.85, 1.15)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Validation: no augmentation
val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def check_dataset():
    """Verify that training data exists."""
    classes = ["thread_present", "thread_missing", "hole_present", "hole_missing", "background"]
    counts = {}
    for cls in classes:
        path = os.path.join(DATASET_DIR, cls)
        if not os.path.isdir(path):
            print(f"  ERROR: Missing folder: {path}")
            print(f"  Run data_collector.py first to capture training images!")
            return False
        count = len([f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.png', '.jpeg'))])
        counts[cls] = count
        if count < 10:
            print(f"  WARNING: Only {count} images in {path}. Need at least 30 for good results.")
    
    print("=" * 50)
    print("DATASET SUMMARY")
    print("=" * 50)
    for cls, count in counts.items():
        bar = "=" * min(count, 50)
        print(f"  {cls:>14}: {count:>4} images  {bar}")
    print("=" * 50)
    
    total = sum(counts.values())
    if total < 30:
        print(f"  ERROR: Only {total} total images. Need at least 30.")
        return False
    
    return True


def create_model(num_classes=3):
    """Create a MobileNetV2 model with custom classifier head."""
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    
    # Freeze early layers (keep pretrained features)
    for param in model.features[:14].parameters():
        param.requires_grad = False
    
    # Replace classifier head
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(model.last_channel, 128),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes),
    )
    
    return model


def train():
    """Main training loop."""
    print("\n" + "=" * 60)
    print("  PQC AI MODEL TRAINER — MobileNetV2 Transfer Learning")
    print("=" * 60)
    
    # Check dataset
    if not check_dataset():
        return
    
    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device: {device}")
    if device.type == "cuda":
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
        print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        print("  WARNING: No GPU detected. Training on CPU (will be slower).")
    
    # Load dataset
    full_dataset = datasets.ImageFolder(DATASET_DIR, transform=train_transform)
    class_names = full_dataset.classes
    num_classes = len(class_names)
    
    print(f"\n  Classes: {class_names}")
    print(f"  Total images: {len(full_dataset)}")
    
    # Split train/val
    train_size = int(TRAIN_SPLIT * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    
    # Apply val transform to validation set
    val_dataset.dataset = datasets.ImageFolder(DATASET_DIR, transform=val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, 
                               num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, 
                             num_workers=0, pin_memory=True)
    
    print(f"  Train: {train_size} images | Val: {val_size} images")
    
    # Create model
    model = create_model(num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    
    # Only train unfrozen parameters
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.Adam(trainable_params, lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=8, gamma=0.3)
    
    total_params = sum(p.numel() for p in model.parameters())
    trainable_count = sum(p.numel() for p in trainable_params)
    print(f"  Model params: {total_params:,} total, {trainable_count:,} trainable")
    
    # Training
    os.makedirs(MODEL_DIR, exist_ok=True)
    best_val_acc = 0.0
    best_epoch = 0
    
    print(f"\n{'='*60}")
    print(f"  Starting training for {NUM_EPOCHS} epochs...")
    print(f"{'='*60}\n")
    
    start_time = time.time()
    
    for epoch in range(NUM_EPOCHS):
        # Train phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
        
        train_loss /= train_total
        train_acc = train_correct / train_total
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_loss /= max(val_total, 1)
        val_acc = val_correct / max(val_total, 1)
        
        scheduler.step()
        
        # Save best model
        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch + 1
            torch.save({
                'model_state_dict': model.state_dict(),
                'class_names': class_names,
                'num_classes': num_classes,
                'image_size': IMAGE_SIZE,
                'val_accuracy': val_acc,
                'epoch': epoch + 1,
            }, MODEL_PATH)
        
        # Print progress
        marker = " * BEST" if val_acc >= best_val_acc else ""
        print(f"  Epoch {epoch+1:>2}/{NUM_EPOCHS}  |  "
              f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.1%}  |  "
              f"Val Loss: {val_loss:.4f}  Acc: {val_acc:.1%}{marker}")
    
    elapsed = time.time() - start_time
    
    # Save metadata
    meta = {
        "class_names": class_names,
        "num_classes": num_classes,
        "image_size": IMAGE_SIZE,
        "best_epoch": best_epoch,
        "best_val_accuracy": best_val_acc,
        "training_time_seconds": round(elapsed, 1),
        "device": str(device),
        "model_path": MODEL_PATH,
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"  TRAINING COMPLETE!")
    print(f"  Best accuracy: {best_val_acc:.1%} (epoch {best_epoch})")
    print(f"  Training time: {elapsed:.0f} seconds")
    print(f"  Model saved: {MODEL_PATH}")
    print(f"  Metadata saved: {META_PATH}")
    print(f"{'='*60}")


if __name__ == "__main__":
    train()
