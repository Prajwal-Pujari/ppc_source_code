"""
Real-time AI Classifier for PQC Hole Inspection.
Loads a trained MobileNetV2 model and classifies camera frames.

Usage:
    from ai_classifier import HoleClassifier
    classifier = HoleClassifier("models/best_model.pth")
    result = classifier.classify(frame)  # returns class name + confidence
"""
import os
import cv2
import torch
import torch.nn as nn
import numpy as np
from torchvision import transforms, models
from dataclasses import dataclass
from typing import Optional
import json


@dataclass
class ClassificationResult:
    """Result of a single frame classification."""
    class_name: str          # "threaded", "plain", or "background"
    confidence: float        # 0.0 to 1.0
    all_probs: dict          # {"threaded": 0.95, "plain": 0.03, "background": 0.02}
    is_hole: bool            # True if threaded or plain
    is_threaded: bool        # True only if threaded


class HoleClassifier:
    """
    Loads a trained MobileNetV2 model and classifies camera frames
    as threaded_hole, plain_hole, or background.
    """
    
    def __init__(self, model_path: str = "models/best_model.pth", 
                 meta_path: str = "models/model_meta.json"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.class_names = []
        self.image_size = 224
        self.is_loaded = False
        
        # Image preprocessing (must match training transforms, minus augmentation)
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Try to load the model
        if os.path.exists(model_path):
            self._load_model(model_path)
        else:
            print(f"  [AI] Model not found at {model_path}")
            print(f"  [AI] Run train_model.py first to train the AI!")
    
    def _load_model(self, model_path: str):
        """Load a trained model from disk."""
        print(f"  [AI] Loading model from {model_path}...")
        print(f"  [AI] Using device: {self.device}")
        
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
        
        self.class_names = checkpoint['class_names']
        num_classes = checkpoint['num_classes']
        self.image_size = checkpoint.get('image_size', 224)
        
        # Recreate model architecture
        self.model = models.mobilenet_v2(weights=None)
        self.model.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(self.model.last_channel, 128),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(128, num_classes),
        )
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        val_acc = checkpoint.get('val_accuracy', 0)
        epoch = checkpoint.get('epoch', 0)
        
        print(f"  [AI] Model loaded! Classes: {self.class_names}")
        print(f"  [AI] Trained for {epoch} epochs, val accuracy: {val_acc:.1%}")
        self.is_loaded = True
    
    def classify(self, frame: np.ndarray, crop_center: bool = True) -> ClassificationResult:
        """
        Classify a camera frame.
        
        Args:
            frame: BGR OpenCV image (from camera)
            crop_center: If True, crop the center 224x224 region before classifying.
                         If False, resize the entire frame.
        
        Returns:
            ClassificationResult with class name, confidence, and probabilities.
        """
        if not self.is_loaded:
            return ClassificationResult(
                class_name="background",
                confidence=0.0,
                all_probs={},
                is_hole=False,
                is_threaded=False,
            )
        
        # Preprocessing
        if crop_center:
            h, w = frame.shape[:2]
            cx, cy = w // 2, h // 2
            half = 400 // 2
            # Ensure bounds are valid
            y1 = max(0, cy - half)
            y2 = min(h, cy + half)
            x1 = max(0, cx - half)
            x2 = min(w, cx + half)
            cropped = frame[y1:y2, x1:x2]
            resized_crop = cv2.resize(cropped, (self.image_size, self.image_size))
            rgb = cv2.cvtColor(resized_crop, cv2.COLOR_BGR2RGB)
        else:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Transform and predict
        input_tensor = self.transform(rgb).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
        
        # Get results
        probs = probabilities.cpu().numpy()
        predicted_idx = int(np.argmax(probs))
        predicted_class = self.class_names[predicted_idx]
        confidence = float(probs[predicted_idx])
        
        all_probs = {name: float(probs[i]) for i, name in enumerate(self.class_names)}
        
        return ClassificationResult(
            class_name=predicted_class,
            confidence=confidence,
            all_probs=all_probs,
            is_hole=predicted_class in ("threaded", "plain"),
            is_threaded=predicted_class == "threaded",
        )
    
    def classify_with_overlay(self, frame: np.ndarray) -> tuple[ClassificationResult, np.ndarray]:
        """
        Classify a frame AND draw the result overlay on the frame.
        Returns (result, annotated_frame).
        """
        result = self.classify(frame, crop_center=True)
        display = frame.copy()
        h, w = display.shape[:2]
        cx, cy = w // 2, h // 2
        half = 400 // 2
        
        # Draw the crop box
        box_color = (0, 255, 0) if result.is_hole else (0, 165, 255)
        cv2.rectangle(display, (cx - half, cy - half), (cx + half, cy + half), box_color, 2)
        
        # Draw classification result
        if self.is_loaded:
            label = f"{result.class_name.upper()} ({result.confidence:.0%})"
            label_color = (0, 255, 0) if result.is_threaded else (255, 200, 0) if result.is_hole else (100, 100, 100)
            
            # Background bar for label
            cv2.rectangle(display, (cx - half, cy + half + 2), (cx + half, cy + half + 30), (30, 30, 30), -1)
            cv2.putText(display, label, (cx - half + 5, cy + half + 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, label_color, 2)
            
            # Probability bars on the right side
            bar_x = w - 220
            bar_y = 100
            for i, (name, prob) in enumerate(result.all_probs.items()):
                y = bar_y + i * 30
                cv2.putText(display, f"{name}:", (bar_x, y + 14), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
                bar_w = int(prob * 120)
                bar_color = (0, 255, 0) if name == result.class_name else (80, 80, 80)
                cv2.rectangle(display, (bar_x + 80, y + 2), (bar_x + 80 + bar_w, y + 18), bar_color, -1)
                cv2.putText(display, f"{prob:.0%}", (bar_x + 85 + bar_w, y + 14),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1)
        
        return result, display
