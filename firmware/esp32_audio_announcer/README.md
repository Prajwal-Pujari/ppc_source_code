# MES Factory - ESP32 IoT Dual Audio Announcer (Wired + Bluetooth)

Complete Arduino firmware that broadcasts factory floor alarms and voice announcements to **BOTH**:
1. **Wired Speaker**: Via mono I2S amplifier on pins **D25 (LRC), D26 (BCLK), D27 (DIN)**
2. **Bluetooth Speaker**: Wirelessly connected to **"Mini boost 4"**

Whenever a trigger signal is received from the MES Factory web interface or HTTP endpoint, the audio plays on **both speakers simultaneously**!

---

## 🔌 Hardware Wiring (Wired Speaker)

| Mono Amplifier Pin | ESP32 Pin | Function | Notes |
| :--- | :--- | :--- | :--- |
| **GND** | **GND** | Ground | Common system ground |
| **VIN / VCC** | **VIN / 5V** | Power | Connect to 5V (from USB) for full 3W loudness |
| **LRC / WS** | **GPIO 25 (D25)** | Word Select Clock | Left/Right Word Clock |
| **BCLK / CLK** | **GPIO 26 (D26)** | Bit Clock | Serial audio timing clock |
| **DIN / DATA** | **GPIO 27 (D27)** | Serial Audio In | Digital PCM audio stream |
| **SD / MODE** | *Unconnected* | Channel Selector | Leave floating: downmixes stereo (L+R)/2 for mono speaker |
| **GAIN** | *Unconnected* | Volume Gain | Leave floating (+9dB) or connect GND (+3dB) |
| **+ / - Out** | **Speaker Leads** | Audio Output | Connect directly to 4Ω or 8Ω speaker (+ and -) |

---

## 📡 Bluetooth Speaker

- Speaker Name: **`Mini boost 4`**
- Turn on your "Mini boost 4" speaker in Bluetooth pairing mode.
- The ESP32 will automatically scan, pair, and stream all alarms and TTS voice announcements to it.

---

## 🚀 Arduino IDE Setup Instructions

### Step 1: Install Required Library
1. In Arduino IDE, go to **Sketch → Include Library → Manage Libraries...** (or press `Ctrl + Shift + I`).
2. Search for: **`ESP32-A2DP`** (by *Phil Schatzmann*).
3. Click **Install**.

### Step 2: Configure Arduino IDE Board & Partition
Under the **Tools** menu, select:
- **Board**: `ESP32 Dev Module`
- **Partition Scheme**: `Huge APP (3MB No OTA / 1MB SPIFFS)` *(Important! Needed to fit both WiFi and Bluetooth)*
- **Upload Speed**: `921600` (or `115200` if upload fails)
- **CPU Frequency**: `240MHz`
- **Port**: Select your ESP32 COM port (e.g. `COM3`, `COM4`)

### Step 3: Configure WiFi & Upload
1. In `esp32_audio_announcer.ino`, set your Wi-Fi name and password:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
2. Click the **Upload (➔)** button.

---

## 🧪 Testing

1. **Power-On Test**:
   The moment the ESP32 turns on, it will play a short chirp on the wired speaker so you know the physical wiring is working.
2. **Bluetooth Connection**:
   Turn on "Mini boost 4". The Serial Monitor at 115200 baud will show:
   `[BT] Bluetooth transmitter active. Auto-connecting to 'Mini boost 4'..."`
3. **Trigger Alarm**:
   Go to `http://192.168.1.100` or the MES Factory interface at `http://192.168.1.100:5173/pqc/iot-devices` and click **"Trigger Alarm"**.
   Sound will play on **both the wired speaker and the Mini boost 4 speaker**!
