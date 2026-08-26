"""
Local CV Inspection App for Sabre Turbine Housing
AI-POWERED + DEFECT LOGGING

Flow:
  1. SCAN DATA MATRIX  → Identifies the part
  2. THREADED HOLE #1  → AI checks thread_present vs thread_missing
  3. THREADED HOLE #2  → Same
  4. THREADED HOLE #3  → Same
  5. THROUGH-HOLE #1   → AI checks hole_present vs hole_missing
  6. THROUGH-HOLE #2   → Same
  7. COMPLETE           → Log results to CSV + send to MES
"""
import cv2
import numpy as np
import time
import os
import csv
import json
import requests
from datetime import datetime
from pylibdmtx.pylibdmtx import decode

from ai_classifier import HoleClassifier

# ==========================================
# CONFIGURATION
# ==========================================
CAMERA_SOURCE = "http://192.168.1.104:8080/video"
MES_FACTORY_API_URL = "http://localhost:8080/api/v1/vision/results"
LOG_DIR = "inspection_logs"
LOG_FILE = os.path.join(LOG_DIR, "inspection_results.csv")

# Auto-lock configuration
AUTO_LOCK_FRAMES = 60       # Increased to ~3 seconds so you can see it working!
COMPLETE_DISPLAY_SECONDS = 8
MIN_CONFIDENCE = 0.85       # Minimum AI confidence to accept (more strict now)

# ==========================================
# CHECKPOINT DEFINITIONS
# From Drawing 6443124 (Sabre Turbine Housing)
# ==========================================
CHECKPOINTS = [
    {
        "id": "THD_1",
        "balloon": "70-73",
        "name": "Threaded Hole #1 (M6)",
        "description": "M6x1.0 — Position 1 of 3 (120 deg apart on front face)",
        "pass_class": "thread_present",    # AI must see this to PASS
        "fail_class": "thread_missing",    # If AI sees this → DEFECT
        "defect_type": "THREAD_MISSING",
    },
    {
        "id": "THD_2",
        "balloon": "70-73",
        "name": "Threaded Hole #2 (M6)",
        "description": "M6x1.0 — Position 2 of 3 (120 deg apart on front face)",
        "pass_class": "thread_present",
        "fail_class": "thread_missing",
        "defect_type": "THREAD_MISSING",
    },
    {
        "id": "THD_3",
        "balloon": "70-73",
        "name": "Threaded Hole #3 (M6)",
        "description": "M6x1.0 — Position 3 of 3 (120 deg apart on front face)",
        "pass_class": "thread_present",
        "fail_class": "thread_missing",
        "defect_type": "THREAD_MISSING",
    },
    {
        "id": "HOLE_1",
        "balloon": "62-67",
        "name": "Through-Hole #1",
        "description": "Through-hole on mounting flange (back side)",
        "pass_class": "hole_present",
        "fail_class": "hole_missing",
        "defect_type": "HOLE_MISSING",
    },
    {
        "id": "HOLE_2",
        "balloon": "62-67",
        "name": "Through-Hole #2",
        "description": "Through-hole on mounting flange (back side)",
        "pass_class": "hole_present",
        "fail_class": "hole_missing",
        "defect_type": "HOLE_MISSING",
    },
]


def init_log_file():
    """Create the CSV log file with headers if it doesn't exist."""
    os.makedirs(LOG_DIR, exist_ok=True)
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp", "part_id", "data_matrix", "overall_result",
                "checkpoint_id", "checkpoint_name", "balloon",
                "ai_class", "ai_confidence", "expected_class",
                "result", "defect_type",
            ])
        print(f"  [LOG] Created log file: {LOG_FILE}")


def log_result(part_id, data_matrix, overall_result, results):
    """Append inspection results to CSV log file."""
    timestamp = datetime.now().isoformat()
    with open(LOG_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        for r in results:
            cp = r["checkpoint"]
            writer.writerow([
                timestamp,
                part_id,
                data_matrix,
                overall_result,
                cp["id"],
                cp["name"],
                cp["balloon"],
                r["ai_class"],
                f"{r['ai_confidence']:.4f}",
                cp["pass_class"],
                "PASS" if r["pass"] else "FAIL",
                cp["defect_type"] if not r["pass"] else "",
            ])
    print(f"  [LOG] Results saved to {LOG_FILE}")


class LocalScannerApp:
    def __init__(self, camera_source):
        self.camera_source = camera_source
        self.cap = None

        # AI Classifier
        self.classifier = HoleClassifier("models/best_model.pth")

        # State
        self.phase = "SCANNING"
        self.checkpoint_index = 0
        self.results = []
        self.part_id = None
        self.data_matrix = None

        # Auto-lock tracking
        self.consecutive_good = 0
        self.consecutive_fail = 0
        self.locked_result = None
        self.lock_display_frames = 0
        self.complete_time = 0

        # Initialize log file
        init_log_file()

        # Window
        self.window_name = "Sabre Turbine Inspection — AI Powered"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, 1024, 768)

    def start(self):
        print(f"\nConnecting to camera: {self.camera_source}")
        self.cap = cv2.VideoCapture(self.camera_source)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        if not self.cap.isOpened():
            print("ERROR: Could not open camera.")
            return

        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"Camera connected: {w}x{h}")

        if self.classifier.is_loaded:
            print("AI Model: LOADED ✓")
        else:
            print("AI Model: NOT LOADED — Run train_model.py first!")

        print("Press [Q] to quit at any time.\n")
        self._run_loop()

    def _run_loop(self):
        while True:
            ret, frame = self.cap.read()
            if not ret or frame is None:
                time.sleep(0.05)
                continue

            if self.phase == "SCANNING":
                display = self._phase_scanning(frame)
            elif self.phase == "CHECKPOINT":
                display = self._phase_checkpoint(frame)
            elif self.phase == "LOCKED_TRANSITION":
                display = self._phase_locked_transition(frame)
            elif self.phase == "COMPLETE":
                display = self._phase_complete(frame)
            else:
                display = frame

            cv2.imshow(self.window_name, display)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break

        self.cap.release()
        cv2.destroyAllWindows()

    # ========================================
    # PHASE: SCANNING (Data Matrix)
    # ========================================
    def _phase_scanning(self, frame):
        display = frame.copy()
        h, w = display.shape[:2]

        # Header
        cv2.rectangle(display, (0, 0), (w, 80), (40, 40, 40), -1)
        cv2.putText(display, "STEP 1: SCAN DATA MATRIX", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
        cv2.putText(display, "Show the engraved 2D code on the part to the camera", (20, 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        # Scanning box
        box_size = min(h, w) // 3
        bx1 = w // 2 - box_size
        by1 = h // 2 - box_size
        bx2 = w // 2 + box_size
        by2 = h // 2 + box_size
        cv2.rectangle(display, (bx1, by1), (bx2, by2), (0, 255, 0), 2)

        # Attempt decode (CROP TO BOX FIRST to make it much faster and more reliable)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        roi = gray[by1:by2, bx1:bx2]
        
        # Increase contrast to make the matrix pop out
        roi = cv2.convertScaleAbs(roi, alpha=1.5, beta=0)
        
        # Decode only the cropped area
        decoded = decode(roi, timeout=200)
        if decoded:
            data = decoded[0].data.decode('utf-8')
            rect = decoded[0].rect
            # Offset the rect coordinates back to the full frame
            cv2.rectangle(display, (bx1 + rect.left, by1 + rect.top),
                          (bx1 + rect.left + rect.width, by1 + rect.top + rect.height),
                          (0, 255, 0), 3)
            self.data_matrix = data
            self.part_id = data
            print(f"\n  ✓ Scanned Part: {self.data_matrix}")
            print(f"  Starting inspection of {len(CHECKPOINTS)} checkpoints...")
            self.phase = "CHECKPOINT"
            self.checkpoint_index = 0
            self.results = []
            self.consecutive_good = 0
            self.consecutive_fail = 0

        # AI status badge
        ai_status = "AI: READY" if self.classifier.is_loaded else "AI: NOT TRAINED"
        ai_color = (0, 255, 0) if self.classifier.is_loaded else (0, 0, 255)
        cv2.putText(display, ai_status, (w - 200, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, ai_color, 2)

        return display

    # ========================================
    # PHASE: CHECKPOINT (AI-powered hole check)
    # ========================================
    def _phase_checkpoint(self, frame):
        cp = CHECKPOINTS[self.checkpoint_index]
        total = len(CHECKPOINTS)
        step_num = self.checkpoint_index + 2

        # Run AI classification
        result, display = self.classifier.classify_with_overlay(frame)
        h, w = display.shape[:2]

        # Check if the AI sees a PASS or FAIL class
        is_pass = (result.class_name == cp["pass_class"] and result.confidence > MIN_CONFIDENCE)
        is_fail = (result.class_name == cp["fail_class"] and result.confidence > MIN_CONFIDENCE)

        if is_pass:
            self.consecutive_good += 1
            self.consecutive_fail = 0
        elif is_fail:
            self.consecutive_fail += 1
            self.consecutive_good = 0
        else:
            # Background or uncertain — reset both
            self.consecutive_good = 0
            self.consecutive_fail = 0

        # ---- Header ----
        cv2.rectangle(display, (0, 0), (w, 90), (40, 40, 40), -1)
        cv2.putText(display, f"STEP {step_num}/{total + 1}: {cp['name']}", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(display, cp["description"], (20, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # What we're looking for
        cv2.putText(display, f"Looking for: {cp['pass_class'].upper()}", (20, 82),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # Part ID
        cv2.putText(display, f"Part: {self.part_id}", (w - 350, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        # ---- Progress bar ----
        progress = max(self.consecutive_good, self.consecutive_fail)
        lock_progress = min(progress / AUTO_LOCK_FRAMES, 1.0)
        bar_x, bar_y = 20, h - 90
        bar_w = w - 40
        bar_h = 20
        cv2.rectangle(display, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (80, 80, 80), -1)

        if is_pass:
            bar_color = (0, 255, 0)
        elif is_fail:
            bar_color = (0, 0, 255)
        else:
            bar_color = (0, 165, 255)

        cv2.rectangle(display, (bar_x, bar_y),
                      (bar_x + int(bar_w * lock_progress), bar_y + bar_h), bar_color, -1)

        cv2.putText(display, f"Lock: {progress}/{AUTO_LOCK_FRAMES}",
                    (bar_x, bar_y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # ---- Status indicator ----
        if is_pass:
            status_text = f"DETECTED: {result.class_name.upper()} ({result.confidence:.0%})"
            status_color = (0, 255, 0)
        elif is_fail:
            status_text = f"DEFECT: {result.class_name.upper()} ({result.confidence:.0%})"
            status_color = (0, 0, 255)
        else:
            status_text = f"Waiting... (seeing: {result.class_name} {result.confidence:.0%})"
            status_color = (0, 165, 255)

        cv2.rectangle(display, (0, h - 60), (w, h - 35), (30, 30, 30), -1)
        cv2.putText(display, status_text, (20, h - 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

        # ---- Step dots ----
        for i in range(total):
            dot_x = w - 30 - (total - 1 - i) * 25
            dot_y = 70
            if i < self.checkpoint_index:
                prev = self.results[i]
                color = (0, 255, 0) if prev["pass"] else (0, 0, 255)
                cv2.circle(display, (dot_x, dot_y), 8, color, -1)
            elif i == self.checkpoint_index:
                cv2.circle(display, (dot_x, dot_y), 8, (0, 255, 255), -1)
            else:
                cv2.circle(display, (dot_x, dot_y), 8, (80, 80, 80), -1)

        # ---- AUTO-LOCK (PASS) ----
        if self.consecutive_good >= AUTO_LOCK_FRAMES:
            self._lock_checkpoint(cp, result, is_pass=True)

        # ---- AUTO-LOCK (FAIL / DEFECT DETECTED) ----
        if self.consecutive_fail >= AUTO_LOCK_FRAMES:
            self._lock_checkpoint(cp, result, is_pass=False)

        return display

    def _lock_checkpoint(self, cp, result, is_pass):
        """Lock in the current checkpoint result."""
        self.locked_result = {
            "checkpoint": cp,
            "ai_class": result.class_name,
            "ai_confidence": result.confidence,
            "pass": is_pass,
        }
        self.results.append(self.locked_result)
        self.consecutive_good = 0
        self.consecutive_fail = 0
        self.lock_display_frames = 40

        status = "PASS" if is_pass else f"FAIL ({cp['defect_type']})"
        print(f"  [{status}] {cp['name']} — AI: {result.class_name} ({result.confidence:.0%})")

        self.phase = "LOCKED_TRANSITION"

    # ========================================
    # PHASE: LOCKED TRANSITION
    # ========================================
    def _phase_locked_transition(self, frame):
        display = frame.copy()
        h, w = display.shape[:2]

        is_pass = self.locked_result["pass"]
        cp = self.locked_result["checkpoint"]

        # Color overlay
        overlay = display.copy()
        color = (0, 180, 0) if is_pass else (0, 0, 200)
        cv2.rectangle(overlay, (0, 0), (w, h), color, -1)
        display = cv2.addWeighted(overlay, 0.3, display, 0.7, 0)

        # Status text
        if is_pass:
            cv2.putText(display, "PASS", (w // 2 - 60, h // 2 - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
        else:
            cv2.putText(display, "DEFECT FOUND", (w // 2 - 130, h // 2 - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            cv2.putText(display, cp["defect_type"], (w // 2 - 100, h // 2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        cv2.putText(display, cp['name'], (w // 2 - 120, h // 2 + 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        self.lock_display_frames -= 1
        if self.lock_display_frames <= 0:
            self.checkpoint_index += 1
            if self.checkpoint_index >= len(CHECKPOINTS):
                self.phase = "COMPLETE"
                self.complete_time = time.time()
                self._submit_results()
            else:
                self.phase = "CHECKPOINT"
                self.consecutive_good = 0
                self.consecutive_fail = 0

        return display

    # ========================================
    # PHASE: COMPLETE
    # ========================================
    def _phase_complete(self, frame):
        display = frame.copy()
        h, w = display.shape[:2]

        # Dark overlay
        overlay = display.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (30, 30, 30), -1)
        display = cv2.addWeighted(overlay, 0.7, display, 0.3, 0)

        all_pass = all(r["pass"] for r in self.results)
        defects = [r for r in self.results if not r["pass"]]

        # Title
        if all_pass:
            cv2.putText(display, "ALL CHECKS PASSED", (w // 2 - 200, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
        else:
            cv2.putText(display, f"DEFECTS FOUND: {len(defects)}", (w // 2 - 180, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

        cv2.putText(display, f"Part: {self.part_id}", (w // 2 - 150, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

        # Results table
        y = 150
        for r in self.results:
            cp = r["checkpoint"]
            if r["pass"]:
                status = "PASS"
                color = (0, 255, 0)
                detail = f"AI: {r['ai_class']} ({r['ai_confidence']:.0%})"
            else:
                status = "FAIL"
                color = (0, 0, 255)
                detail = f"DEFECT: {cp['defect_type']} ({r['ai_confidence']:.0%})"

            cv2.putText(display, f"  [{status}] {cp['name']}", (40, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            cv2.putText(display, detail, (w - 320, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)
            y += 35

        # Auto-restart timer
        elapsed = time.time() - self.complete_time
        remaining = COMPLETE_DISPLAY_SECONDS - elapsed
        if remaining > 0:
            cv2.putText(display, f"Next scan in {remaining:.0f}s...", (w // 2 - 100, h - 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1)
        else:
            self.phase = "SCANNING"
            self.checkpoint_index = 0
            self.results = []
            self.part_id = None
            self.data_matrix = None
            self.consecutive_good = 0
            self.consecutive_fail = 0
            print("\n  Ready for next part...\n")

        return display

    # ========================================
    # SUBMIT & LOG RESULTS
    # ========================================
    def _submit_results(self):
        all_pass = all(r["pass"] for r in self.results)
        overall = "PASS" if all_pass else "FAIL"
        defects = [r for r in self.results if not r["pass"]]

        # Console output
        print(f"\n  {'=' * 50}")
        print(f"  INSPECTION RESULT — Part: {self.part_id}")
        print(f"  {'=' * 50}")
        for r in self.results:
            cp = r["checkpoint"]
            if r["pass"]:
                print(f"    [PASS] {cp['name']} — {r['ai_class']} ({r['ai_confidence']:.0%})")
            else:
                print(f"    [FAIL] {cp['name']} — {cp['defect_type']} ({r['ai_confidence']:.0%})")

        if defects:
            print(f"\n  ⚠ DEFECTS LOGGED:")
            for r in defects:
                print(f"    → {r['checkpoint']['defect_type']} at {r['checkpoint']['name']}")

        print(f"\n  Overall: {overall}")

        # Log to CSV
        log_result(self.part_id, self.data_matrix, overall, self.results)

        # Submit to MES backend
        payload = {
            "partId": self.part_id,
            "dataMatrix": self.data_matrix,
            "overallResult": overall,
            "inspectionMethod": "AI_MOBILENET_V2",
            "inspectedAt": datetime.now().isoformat(),
            "defectsFound": len(defects),
            "checkpoints": [
                {
                    "id": r["checkpoint"]["id"],
                    "name": r["checkpoint"]["name"],
                    "balloon": r["checkpoint"]["balloon"],
                    "expectedClass": r["checkpoint"]["pass_class"],
                    "aiClass": r["ai_class"],
                    "aiConfidence": r["ai_confidence"],
                    "result": "PASS" if r["pass"] else "FAIL",
                    "defectType": r["checkpoint"]["defect_type"] if not r["pass"] else None,
                }
                for r in self.results
            ],
        }

        try:
            resp = requests.post(MES_FACTORY_API_URL, json=payload, timeout=5)
            if resp.status_code == 200:
                print(f"  ✓ Results sent to MES!")
            else:
                print(f"  ✗ MES returned status {resp.status_code}")
        except Exception as e:
            print(f"  ✗ Could not reach MES backend: {e}")
            print(f"  (Results saved locally in {LOG_FILE})")

        print(f"  {'=' * 50}\n")


# ==========================================
# MAIN
# ==========================================
if __name__ == "__main__":
    app = LocalScannerApp(CAMERA_SOURCE)
    app.start()
