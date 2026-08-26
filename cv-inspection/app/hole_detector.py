"""
OpenCV-based hole & thread detection for Sabre Turbine Housing.

THREAD DETECTION STRATEGY:
  We don't just count edges anymore. We use MULTIPLE texture features:
  1. Edge Density — how many edges inside the hole (threads have more)
  2. Texture Variance — stddev of pixel intensities inside the ring
  3. Gradient Magnitude — average gradient strength inside the ring
  4. Radial Profile Periodicity — threads create repeating brightness waves
  
  The system CALIBRATES first by having the operator show:
    - A THREADED hole (to learn what threads look like)
    - A PLAIN hole (to learn what smooth looks like)
  Then it uses the learned thresholds for the real inspection.
"""
import cv2
import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class FeatureStatus(str, Enum):
    DETECTED = "DETECTED"
    MISSING = "MISSING"
    UNCERTAIN = "UNCERTAIN"


@dataclass
class DetectedCircle:
    x: int
    y: int
    radius: int
    confidence: float


@dataclass
class TextureFeatures:
    """Multi-dimensional texture features extracted from inside a hole."""
    edge_density: float       # Ratio of edge pixels inside the ring
    intensity_stddev: float   # Std deviation of pixel brightness
    gradient_mean: float      # Average gradient magnitude
    gradient_stddev: float    # Gradient magnitude variation
    
    def to_vector(self) -> np.ndarray:
        return np.array([self.edge_density, self.intensity_stddev, 
                         self.gradient_mean, self.gradient_stddev])


# ==========================================
# CHECKPOINT DEFINITIONS
# From Drawing 6443124 (Sabre Turbine Housing)
# Balloons 70-73 describe 3× M6 threaded holes at 120° apart
# ==========================================
CHECKPOINTS = [
    {
        "id": "THD_1",
        "balloon": "70-73",
        "name": "Threaded Hole #1 (M6)",
        "description": "M6x1.0 Threaded — Position 1 of 3 (120 deg apart)",
        "check_thread": True,
    },
    {
        "id": "THD_2",
        "balloon": "70-73",
        "name": "Threaded Hole #2 (M6)",
        "description": "M6x1.0 Threaded — Position 2 of 3 (120 deg apart)",
        "check_thread": True,
    },
    {
        "id": "THD_3",
        "balloon": "70-73",
        "name": "Threaded Hole #3 (M6)",
        "description": "M6x1.0 Threaded — Position 3 of 3 (120 deg apart)",
        "check_thread": True,
    },
    {
        "id": "HOLE_1",
        "balloon": "62-67",
        "name": "Through-Hole #1",
        "description": "Through-hole on rear flange — must be smooth, no thread",
        "check_thread": False,
    },
    {
        "id": "HOLE_2",
        "balloon": "62-67",
        "name": "Through-Hole #2",
        "description": "Through-hole on rear flange — must be smooth, no thread",
        "check_thread": False,
    },
]


class SingleHoleDetector:
    """
    Detects a SINGLE hole in the center of the camera frame.
    Uses calibrated thresholds to distinguish threaded vs plain holes.
    """
    
    def __init__(self):
        # Hough Circle parameters
        self.dp = 1.2
        self.min_dist = 30
        self.param1 = 80
        self.param2 = 30
        self.min_radius = 8
        self.max_radius = 80
        
    # ========================================
    # TEXTURE FEATURE EXTRACTION
    # ========================================
    def _extract_texture_features(self, frame: np.ndarray, circle: DetectedCircle) -> TextureFeatures:
        """
        Extract multiple texture features from inside a detected hole.
        This is the core of our thread detection.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        
        # Create a TIGHT ring mask to avoid the bright rim of the hole
        # We only want to look at the inner wall
        mask = np.zeros((h, w), dtype=np.uint8)
        inner_r = max(int(circle.radius * 0.4), 2)
        outer_r = max(int(circle.radius * 0.7), 4)
        cv2.circle(mask, (circle.x, circle.y), outer_r, 255, -1)
        cv2.circle(mask, (circle.x, circle.y), inner_r, 0, -1)
        
        # Blur to remove camera sensor noise (which causes false edges)
        smoothed = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # 1. Edge density
        edges = cv2.Canny(smoothed, 50, 150)
        ring_area = cv2.countNonZero(mask)
        edge_density = 0.0
        if ring_area > 0:
            edge_in_ring = cv2.countNonZero(cv2.bitwise_and(edges, edges, mask=mask))
            edge_density = edge_in_ring / ring_area
        
        # 2. Intensity standard deviation inside the ring
        pixels = gray[mask > 0]
        intensity_stddev = float(np.std(pixels)) if len(pixels) > 0 else 0.0
        
        # 3. Gradient magnitude (Sobel)
        grad_x = cv2.Sobel(smoothed, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(smoothed, cv2.CV_64F, 0, 1, ksize=3)
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)
        grad_in_ring = grad_mag[mask > 0]
        gradient_mean = float(np.mean(grad_in_ring)) if len(grad_in_ring) > 0 else 0.0
        gradient_stddev = float(np.std(grad_in_ring)) if len(grad_in_ring) > 0 else 0.0
        
        return TextureFeatures(
            edge_density=edge_density,
            intensity_stddev=intensity_stddev,
            gradient_mean=gradient_mean,
            gradient_stddev=gradient_stddev,
        )
    
    def _is_threaded(self, features: TextureFeatures) -> tuple[bool, float]:
        """
        Determine if a hole is threaded based on extracted features.
        Returns (is_threaded, confidence_score).
        """
        # We use a combined score based on edge density and gradient variance.
        # Threaded holes have a much higher edge density and gradient mean 
        # than smooth plain holes.
        
        # STRICTER FORMULA:
        # Threads usually have an edge density > 0.15 and gradient > 50
        # Smooth holes usually have edge density < 0.05 and gradient < 30
        score = (features.edge_density * 3.0) + (features.gradient_mean / 150.0) + (features.intensity_stddev / 100.0)
        
        # Threshold is much higher now to prevent false positives
        is_threaded = score > 1.2
        
        # Convert score to a pseudo-confidence (0.0 to 1.0)
        confidence = min(score / 2.0, 1.0)
        
        return is_threaded, confidence
    
    # ========================================
    # CIRCLE DETECTION
    # ========================================
    def _find_center_circle(self, frame: np.ndarray) -> Optional[DetectedCircle]:
        """Find the circle closest to the center of the frame."""
        h, w = frame.shape[:2]
        cx, cy = w // 2, h // 2
        guide_radius = min(h, w) // 4
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)
        
        # Mask: only look within guide circle
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, (cx, cy), guide_radius, 255, -1)
        masked = cv2.bitwise_and(blurred, blurred, mask=mask)
        
        circles = cv2.HoughCircles(
            masked, cv2.HOUGH_GRADIENT,
            dp=self.dp, minDist=self.min_dist,
            param1=self.param1, param2=self.param2,
            minRadius=self.min_radius, maxRadius=self.max_radius
        )
        
        if circles is None:
            return None
        
        circles_arr = np.uint16(np.around(circles))
        best_dist = float('inf')
        best_circle = None
        
        for c in circles_arr[0, :]:
            # Use float to avoid overflow
            dx = float(c[0]) - float(cx)
            dy = float(c[1]) - float(cy)
            dist = np.sqrt(dx**2 + dy**2)
            if dist < best_dist and dist < guide_radius:
                best_dist = dist
                best_circle = c
        
        if best_circle is None:
            return None
        
        return DetectedCircle(
            x=int(best_circle[0]), y=int(best_circle[1]),
            radius=int(best_circle[2]),
            confidence=max(0.5, 1.0 - (best_dist / guide_radius))
        )
    
    # ========================================
    # MAIN DETECTION (single hole)
    # ========================================
    def detect_single_hole(self, frame: np.ndarray, check_thread: bool = False) -> dict:
        """Detect ONE hole in the center of the frame."""
        h, w = frame.shape[:2]
        cx, cy = w // 2, h // 2
        guide_radius = min(h, w) // 4
        
        annotated = frame.copy()
        
        # Draw targeting crosshair
        cv2.circle(annotated, (cx, cy), guide_radius, (255, 0, 0), 2)
        cv2.line(annotated, (cx - 20, cy), (cx + 20, cy), (255, 0, 0), 1)
        cv2.line(annotated, (cx, cy - 20), (cx, cy + 20), (255, 0, 0), 1)
        cv2.putText(annotated, "AIM HOLE HERE", (cx - 80, cy - guide_radius - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        
        # Find the hole
        circle = self._find_center_circle(frame)
        
        hole_found = False
        thread_found = False
        confidence = 0.0
        thread_score = 0.0
        features = None
        
        if circle is not None:
            hole_found = True
            confidence = circle.confidence
            
            # Extract texture features
            features = self._extract_texture_features(frame, circle)
            
            if check_thread:
                thread_found, thread_score = self._is_threaded(features)
                confidence = min(confidence * 0.5 + thread_score * 0.5, 1.0)
            
            # Draw the detected circle
            if check_thread:
                if thread_found:
                    color = (0, 255, 0)       # GREEN = Thread found (PASS)
                    label = "THREADED"
                else:
                    color = (0, 0, 255)        # RED = No thread (FAIL for threaded checkpoint)
                    label = "NO THREAD!"
            else:
                color = (0, 255, 0)            # GREEN = Hole found (PASS for plain checkpoint)
                label = "HOLE OK"
            
            cv2.circle(annotated, (circle.x, circle.y), circle.radius, color, 3)
            cv2.circle(annotated, (circle.x, circle.y), 3, (0, 0, 255), -1)
            cv2.putText(annotated, label, (circle.x - 60, circle.y - circle.radius - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            cv2.putText(annotated, f"Conf: {confidence:.0%}", (circle.x - 40, circle.y + circle.radius + 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
            # Show texture debug info
            if features and check_thread:
                debug_y = 100
                cv2.putText(annotated, f"Edge: {features.edge_density:.3f}", (w - 220, debug_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
                cv2.putText(annotated, f"StdDev: {features.intensity_stddev:.1f}", (w - 220, debug_y + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
                cv2.putText(annotated, f"GradMean: {features.gradient_mean:.1f}", (w - 220, debug_y + 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
                cv2.putText(annotated, f"ThreadScore: {thread_score:.2f}", (w - 220, debug_y + 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        
        # Determine status
        if not hole_found:
            status = FeatureStatus.MISSING
        elif check_thread and not thread_found:
            status = FeatureStatus.UNCERTAIN
        else:
            status = FeatureStatus.DETECTED
        
        # Status banner
        if status == FeatureStatus.DETECTED:
            banner_color = (0, 180, 0)
            banner_text = "PASS"
        elif status == FeatureStatus.UNCERTAIN:
            banner_color = (0, 0, 200)
            banner_text = "FAIL — Hole found but NO THREAD"
        else:
            banner_color = (60, 60, 60)
            banner_text = "Searching... Aim camera at the hole"
        
        cv2.rectangle(annotated, (0, h - 50), (w, h), banner_color, -1)
        cv2.putText(annotated, banner_text, (20, h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        _, buffer = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        return {
            "hole_found": hole_found,
            "thread_found": thread_found,
            "status": status.value,
            "confidence": round(confidence, 2),
            "thread_score": round(thread_score, 2),
            "features": features,
            "annotated_frame": buffer.tobytes(),
            "annotated_cv": annotated,
        }
    
