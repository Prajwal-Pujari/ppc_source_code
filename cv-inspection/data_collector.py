"""
PQC AI Data Collector — AUTO-CAPTURE Version
Just press a key once to start recording, then move the camera slowly.
Photos are captured automatically every 0.3 seconds.

  T = Start capturing thread_present
  N = Start capturing thread_missing
  H = Start capturing hole_present
  M = Start capturing hole_missing
  B = Start capturing background
  S = STOP capturing
  Q = Quit
"""
import cv2
import os
import uuid
import time

# Configuration
CAMERA_SOURCE = "http://192.168.1.104:8080/video"
CROP_SIZE = 400  # Bigger box to see surrounding context
SAVE_SIZE = 224  # Standard input size for MobileNet
AUTO_CAPTURE_INTERVAL = 0.3  # seconds between auto-captures

# 5 Classes
CLASSES = {
    ord('t'): "thread_present",
    ord('n'): "thread_missing",
    ord('h'): "hole_present",
    ord('m'): "hole_missing",
    ord('b'): "background",
}

# Create directories
for cat in CLASSES.values():
    os.makedirs(f"dataset/{cat}", exist_ok=True)


def count_images(cat):
    path = f"dataset/{cat}"
    return len([f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.png', '.jpeg'))])


def main():
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    if not cap.isOpened():
        print("ERROR: Could not open camera.")
        return

    print("=" * 55)
    print("   PQC AI DATA COLLECTOR — AUTO-CAPTURE MODE")
    print("=" * 55)
    print()
    print("  Press a key to START auto-capturing that class:")
    print("    T = Thread present (aim at threaded holes)")
    print("    N = Thread missing (aim at smooth holes)")
    print("    H = Hole present (aim at through-holes)")
    print("    M = Hole missing (aim at solid metal)")
    print("    B = Background (aim at desk, surface, etc)")
    print()
    print("  Press S to STOP capturing")
    print("  Press Q to Quit")
    print()
    print("  Just slowly move the camera around while it")
    print("  auto-captures a photo every 0.3 seconds!")
    print("=" * 55)

    recording_class = None  # Currently recording this class (or None)
    last_capture_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break

        h, w = frame.shape[:2]
        cx, cy = w // 2, h // 2
        half = CROP_SIZE // 2

        if cy - half < 0 or cy + half > h or cx - half < 0 or cx + half > w:
            print("Camera resolution too small.")
            break

        display = frame.copy()

        # Green targeting box
        box_color = (0, 0, 255) if recording_class else (0, 255, 0)
        cv2.rectangle(display, (cx - half, cy - half), (cx + half, cy + half), box_color, 3)

        # Stats header
        cv2.rectangle(display, (0, 0), (w, 65), (30, 30, 30), -1)
        stats = (f"T:{count_images('thread_present')} "
                 f"N:{count_images('thread_missing')} "
                 f"H:{count_images('hole_present')} "
                 f"M:{count_images('hole_missing')} "
                 f"B:{count_images('background')}")
        cv2.putText(display, stats, (15, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)

        if recording_class:
            # Show recording indicator (flashing red)
            flash = int(time.time() * 4) % 2 == 0
            rec_color = (0, 0, 255) if flash else (0, 0, 180)
            cv2.circle(display, (20, 50), 8, rec_color, -1)
            cv2.putText(display, f"REC: {recording_class.upper()} — Move camera slowly. Press S to stop.",
                        (35, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)

            # Auto-capture
            now = time.time()
            if now - last_capture_time >= AUTO_CAPTURE_INTERVAL:
                crop = frame[cy - half:cy + half, cx - half:cx + half]
                crop_resized = cv2.resize(crop, (SAVE_SIZE, SAVE_SIZE))
                filename = f"{uuid.uuid4().hex}.jpg"
                cv2.imwrite(f"dataset/{recording_class}/{filename}", crop_resized)
                count = count_images(recording_class)
                last_capture_time = now

                # Flash effect on save
                cv2.rectangle(display, (cx - half, cy - half), (cx + half, cy + half), (255, 255, 255), 5)
                print(f"  [+] {recording_class}: {count} images", end="\r")
        else:
            cv2.putText(display, "READY — Press T/N/H/M/B to start recording",
                        (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

        cv2.imshow("Data Collector — Auto Capture", display)

        key = cv2.waitKey(1) & 0xFF

        if key in CLASSES:
            recording_class = CLASSES[key]
            last_capture_time = 0  # Capture immediately
            print(f"\n  >>> Recording: {recording_class.upper()} — move camera slowly...")

        elif key == ord('s'):
            if recording_class:
                count = count_images(recording_class)
                print(f"\n  <<< Stopped: {recording_class} ({count} images total)")
                recording_class = None

        elif key == ord('q'):
            print("\n\nDataset summary:")
            for cat in CLASSES.values():
                print(f"  {cat}: {count_images(cat)} images")
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
