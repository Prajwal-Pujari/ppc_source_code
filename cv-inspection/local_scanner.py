"""
Local CV Inspection App for Sabre Turbine Housing
FULLY AUTOMATIC + CALIBRATION

Flow:
  0. CALIBRATE THREADED → Show a threaded hole to learn its texture
  0. CALIBRATE PLAIN    → Show a plain hole to learn its texture
  1. SCAN DATA MATRIX  → Auto-detects the engraved 2D code
  2. THREADED HOLE #1  → Camera auto-detects hole + thread → auto-locks
  3. THREADED HOLE #2  → Same
  4. THREADED HOLE #3  → Same
  5. THROUGH-HOLE #1   → Camera auto-detects hole → auto-locks
  6. THROUGH-HOLE #2   → Same
  7. COMPLETE           → Shows pass/fail, sends to MES
"""
import cv2
import numpy as np
import time
import requests
from pylibdmtx.pylibdmtx import decode

from app.hole_detector import SingleHoleDetector, CHECKPOINTS, FeatureStatus

# ==========================================
# CONFIGURATION
# ==========================================
CAMERA_SOURCE = "http://192.168.1.102:8080/video"
MES_FACTORY_API_URL = "http://localhost:8080/api/v1/vision/results"

# Auto-lock configuration
AUTO_LOCK_FRAMES = 25       # ~1.2 seconds at 20fps
AUTO_LOCK_RESET_ON_FAIL = True  
COMPLETE_DISPLAY_SECONDS = 8  


class LocalScannerApp:
    def __init__(self, camera_source):
        self.camera_source = camera_source
        self.cap = None
        self.detector = SingleHoleDetector()

        # State
        self.phase = "SCANNING"  
        self.checkpoint_index = 0
        self.results = []
        self.part_id = None
        self.data_matrix = None

        # Auto-lock tracking
        self.consecutive_good = 0      
        self.locked_result = None      
        self.lock_display_frames = 0   
        self.complete_time = 0         

        # Window
        self.window_name = "Sabre Turbine Inspection"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, 1024, 768)

    def start(self):
        print(f"Connecting to camera: {self.camera_source}")
        self.cap = cv2.VideoCapture(self.camera_source)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        if not self.cap.isOpened():
            print("ERROR: Could not open camera.")
            return

        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"Camera connected: {w}x{h}")
        print("Press [SPACE] during calibration to lock in features.")
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

        cv2.rectangle(display, (0, 0), (w, 80), (40, 40, 40), -1)
        cv2.putText(display, "STEP 1: SCAN DATA MATRIX", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
        cv2.putText(display, "Show the engraved 2D code on the part to the camera", (20, 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        box_size = min(h, w) // 3
        bx1 = w // 2 - box_size
        by1 = h // 2 - box_size
        bx2 = w // 2 + box_size
        by2 = h // 2 + box_size
        cv2.rectangle(display, (bx1, by1), (bx2, by2), (0, 255, 0), 2)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        decoded = decode(gray, timeout=100)
        if decoded:
            data = decoded[0].data.decode('utf-8')
            rect = decoded[0].rect
            cv2.rectangle(display, (rect.left, rect.top),
                          (rect.left + rect.width, rect.top + rect.height),
                          (0, 255, 0), 3)
            self.data_matrix = data
            self.part_id = data
            print(f"  Scanned: {self.data_matrix}")
            self.phase = "CHECKPOINT"
            self.checkpoint_index = 0
            self.results = []
            self.consecutive_good = 0

        return display

    # ========================================
    # PHASE: CHECKPOINT (Auto-detecting one hole)
    # ========================================
    def _phase_checkpoint(self, frame):
        cp = CHECKPOINTS[self.checkpoint_index]
        total = len(CHECKPOINTS)
        step_num = self.checkpoint_index + 2

        result = self.detector.detect_single_hole(frame, check_thread=cp["check_thread"])
        display = result["annotated_cv"]
        h, w = display.shape[:2]

        is_good = False
        if cp["check_thread"]:
            is_good = result["hole_found"] and result["thread_found"]
        else:
            is_good = result["hole_found"]

        if is_good:
            self.consecutive_good += 1
        elif AUTO_LOCK_RESET_ON_FAIL:
            self.consecutive_good = 0

        cv2.rectangle(display, (0, 0), (w, 90), (40, 40, 40), -1)
        cv2.putText(display, f"STEP {step_num}/{total + 1}: {cp['name']}", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(display, cp["description"], (20, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        if cp["check_thread"]:
            cv2.putText(display, "Checking: HOLE + THREAD", (20, 82),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
        else:
            cv2.putText(display, "Checking: HOLE PRESENCE", (20, 82),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        cv2.putText(display, f"Part: {self.part_id}", (w - 350, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        lock_progress = min(self.consecutive_good / AUTO_LOCK_FRAMES, 1.0)
        bar_x, bar_y = 20, h - 90
        bar_w = w - 40
        bar_h = 20
        cv2.rectangle(display, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (80, 80, 80), -1)
        bar_color = (0, 255, 0) if is_good else (0, 0, 200)
        cv2.rectangle(display, (bar_x, bar_y),
                      (bar_x + int(bar_w * lock_progress), bar_y + bar_h), bar_color, -1)
        
        cv2.putText(display, f"Auto-Lock: {self.consecutive_good}/{AUTO_LOCK_FRAMES}",
                    (bar_x, bar_y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        for i in range(total):
            dot_x = w - 30 - (total - 1 - i) * 25
            dot_y = 70
            if i < self.checkpoint_index:
                cv2.circle(display, (dot_x, dot_y), 8, (0, 255, 0), -1) 
            elif i == self.checkpoint_index:
                cv2.circle(display, (dot_x, dot_y), 8, (0, 255, 255), -1) 
            else:
                cv2.circle(display, (dot_x, dot_y), 8, (100, 100, 100), -1)

        cv2.rectangle(display, (0, h - 45), (w, h), (40, 40, 40), -1)
        if is_good:
            cv2.putText(display, "Hold steady... auto-locking", (20, h - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        else:
            cv2.putText(display, "Aim camera at the hole...", (20, h - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        if self.consecutive_good >= AUTO_LOCK_FRAMES:
            self._lock_checkpoint(cp, result)

        return display

    def _lock_checkpoint(self, cp, result):
        self.results.append({
            "checkpoint_id": cp["id"],
            "balloon": cp["balloon"],
            "name": cp["name"],
            "status": result["status"],
            "hole_found": result["hole_found"],
            "thread_found": result["thread_found"],
            "confidence": result["confidence"],
        })

        status_text = "PASS" if result["status"] == FeatureStatus.DETECTED.value else "FAIL"
        print(f"  AUTO-LOCKED [{status_text}] {cp['name']} "
              f"(hole={result['hole_found']}, thread={result['thread_found']}, "
              f"conf={result['confidence']:.0%})")

        self.consecutive_good = 0
        self.lock_display_frames = 30
        self.locked_result = result
        self.phase = "LOCKED_TRANSITION"

    def _phase_locked_transition(self, frame):
        display = frame.copy()
        h, w = display.shape[:2]

        overlay = display.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (0, 100, 0), -1)
        cv2.addWeighted(overlay, 0.4, display, 0.6, 0, display)

        cp_done = CHECKPOINTS[self.checkpoint_index]
        cv2.putText(display, "LOCKED!", (w // 2 - 100, h // 2 - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 255, 0), 4)
        cv2.putText(display, f"{cp_done['name']}", (w // 2 - 180, h // 2 + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        next_index = self.checkpoint_index + 1
        if next_index < len(CHECKPOINTS):
            next_cp = CHECKPOINTS[next_index]
            cv2.putText(display, f"Next: {next_cp['name']}", (w // 2 - 180, h // 2 + 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
            cv2.putText(display, "Move camera to the next hole...", (w // 2 - 200, h // 2 + 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        else:
            cv2.putText(display, "All checkpoints done!", (w // 2 - 180, h // 2 + 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

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

        return display

    def _phase_complete(self, frame):
        display = np.zeros_like(frame)
        h, w = display.shape[:2]

        cv2.putText(display, "INSPECTION COMPLETE", (w // 2 - 220, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 3)
        cv2.putText(display, f"Part: {self.part_id}", (w // 2 - 120, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)

        y = 160
        all_pass = True
        for i, (cp, res) in enumerate(zip(CHECKPOINTS, self.results)):
            status = res["status"]
            if status == FeatureStatus.DETECTED.value:
                color = (0, 255, 0)
                icon = "PASS"
            elif status == FeatureStatus.UNCERTAIN.value:
                color = (0, 200, 255)
                icon = "WARN"
                all_pass = False
            else:
                color = (0, 0, 255)
                icon = "FAIL"
                all_pass = False

            line = f"  [{icon}] {cp['name']}"
            if cp["check_thread"]:
                thread_str = "YES" if res["thread_found"] else "NO"
                line += f"  | Hole: {'YES' if res['hole_found'] else 'NO'} | Thread: {thread_str}"
            else:
                line += f"  | Hole: {'YES' if res['hole_found'] else 'NO'}"
            line += f"  | Conf: {res['confidence']:.0%}"

            cv2.putText(display, line, (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            y += 35

        y += 30
        if all_pass:
            cv2.putText(display, "VERDICT: PASS", (w // 2 - 150, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
        else:
            cv2.putText(display, "VERDICT: FAIL — QA ALERT", (w // 2 - 250, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)

        elapsed = time.time() - self.complete_time
        remaining = max(0, COMPLETE_DISPLAY_SECONDS - elapsed)
        cv2.putText(display, f"Starting new part in {remaining:.0f}s...", (30, h - 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1)
        cv2.putText(display, "[Q] to quit", (30, h - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)

        if elapsed >= COMPLETE_DISPLAY_SECONDS:
            self._reset()

        return display

    def _reset(self):
        self.phase = "SCANNING"
        self.checkpoint_index = 0
        self.results = []
        self.part_id = None
        self.data_matrix = None
        self.consecutive_good = 0
        print("\n--- Ready for next part ---\n")

    def _submit_results(self):
        has_defect = any(r["status"] != FeatureStatus.DETECTED.value for r in self.results)
        verdict = "FAIL" if has_defect else "PASS"

        print(f"\n{'='*50}")
        print(f"  INSPECTION COMPLETE — {verdict}")
        print(f"  Part: {self.part_id}")
        for r in self.results:
            s = "PASS" if r["status"] == "DETECTED" else "FAIL"
            print(f"    [{s}] {r['name']} — hole={r['hole_found']} thread={r['thread_found']}")
        if has_defect:
            print(f"  *** QA ALERT: Defect detected! ***")
        print(f"{'='*50}\n")

        payload = {
            "partId": self.part_id,
            "dataMatrix": self.data_matrix,
            "passed": not has_defect,
            "verdict": verdict,
            "defectAlert": "Defect detected — QA notified" if has_defect else None,
            "checkpoints": self.results,
        }
        try:
            # response = requests.post(MES_FACTORY_API_URL, json=payload, timeout=5)
            # print(f"  MES Response: {response.status_code}")
            print(f"  (MES submission simulated)")
        except Exception as e:
            print(f"  Submit failed: {e}")


if __name__ == "__main__":
    app = LocalScannerApp(CAMERA_SOURCE)
    app.start()
