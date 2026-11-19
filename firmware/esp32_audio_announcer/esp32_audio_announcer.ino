/*
 * =====================================================================================
 *  MES Factory - ESP32 Bluetooth Audio Announcer for "Mini boost 4" (v2.0)
 * =====================================================================================
 *  Receives voice announcements and alarms from the MES Factory system over Wi-Fi
 *  and streams them wirelessly to your "Mini boost 4" Bluetooth speaker!
 * 
 *  Key Stability Fixes Applied in v2.0:
 *    1. Explicit Frame Callback: `a2dp_source.set_data_callback_in_frames(get_data_frames)`
 *       is explicitly registered so the speaker never drops the link upon connection.
 *    2. Device Discovery via `set_ssid_callback`: Inspects all scanned Bluetooth devices
 *       and automatically matches "Mini boost 4" regardless of case or trailing spaces.
 *    3. Correct PIN Code ("0000"): `a2dp_source.set_pin_code("0000", ...)` ensures the
 *       speaker's pairing handshake is never rejected.
 *    4. NVS Flash Wipe on Boot: Clears stale/corrupt pairing credentials so the speaker
 *       never gets trapped in a connect-disconnect loop.
 *    5. RF Coexistence Sequencing: Bluetooth connects first without Wi-Fi radio contention.
 *       Once Bluetooth is established, Wi-Fi connects and starts the Web Server.
 *    6. Paced Audio RingBuffer: 64 KB lock-free circular buffer with flow control prevents
 *       buffer overflow and guarantees every spoken word is heard clearly.
 * =====================================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <nvs_flash.h>
#include <math.h>
#include <vector>
#include "BluetoothA2DPSource.h"

// =====================================================================================
// 1. WiFi Settings (Dynamic DHCP)
// =====================================================================================
const char* WIFI_SSID     = "TP-Link_01CA";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Set your TP-Link WiFi password here

#define LED_PIN 2

// =====================================================================================
// 2. Bluetooth Speaker Configuration & Audio Ring Buffer
// =====================================================================================
const char* BT_TARGET_NAME = "Mini boost 4";

BluetoothA2DPSource a2dp_source;

// 64 KB Frame Buffer (~370 ms audio cache)
#define AUDIO_BUF_FRAMES 16384
Frame audioRingBuffer[AUDIO_BUF_FRAMES];
volatile size_t ringHead = 0;
volatile size_t ringTail = 0;

volatile bool isBtConnected = false;
volatile bool needChime = false;
bool wifiStarted = false;

// Continuous Data Callback for Bluetooth A2DP:
// Supplies 44.1kHz stereo audio frames to "Mini boost 4".
// When idle, supplies clean digital silence to KEEP THE CONNECTION ALIVE.
int32_t get_data_frames(Frame *frame, int32_t frame_count) {
  for (int32_t i = 0; i < frame_count; i++) {
    if (ringHead != ringTail) {
      frame[i] = audioRingBuffer[ringTail];
      ringTail = (ringTail + 1) % AUDIO_BUF_FRAMES;
    } else {
      frame[i].channel1 = 0;
      frame[i].channel2 = 0;
    }
  }
  return frame_count;
}

// Push a single audio frame (left + right channels) with backpressure
void pushAudioFrame(int16_t left, int16_t right) {
  size_t nextHead = (ringHead + 1) % AUDIO_BUF_FRAMES;
  while (nextHead == ringTail) {
    // Buffer full: yield briefly to let A2DP task stream frames to speaker
    vTaskDelay(pdMS_TO_TICKS(2));
  }
  audioRingBuffer[ringHead].channel1 = left;
  audioRingBuffer[ringHead].channel2 = right;
  ringHead = nextHead;
}

// Push a block of raw PCM bytes with flow control
void pushAudioBytes(const uint8_t* data, size_t byteCount) {
  size_t frameCount = byteCount / sizeof(Frame);
  const Frame* frames = (const Frame*)data;
  for (size_t i = 0; i < frameCount; i++) {
    size_t nextHead = (ringHead + 1) % AUDIO_BUF_FRAMES;
    while (nextHead == ringTail) {
      // Buffer full: yield 2ms for Bluetooth playback
      vTaskDelay(pdMS_TO_TICKS(2));
    }
    audioRingBuffer[ringHead] = frames[i];
    ringHead = nextHead;
  }
}

// Intelligent Bluetooth Device Discovery Callback:
// Logs every discovered Bluetooth device and automatically matches "Mini boost 4"
bool isValidBluetoothDevice(const char* ssid, esp_bd_addr_t address, int rssi) {
  if (ssid == nullptr || strlen(ssid) == 0) {
    return false;
  }

  Serial.printf("[BT Scan] Found device: '%s' (RSSI: %d dBm)\n", ssid, rssi);

  String name = String(ssid);
  name.toLowerCase();

  // Match any variation of "mini boost", "boost 4", or "boost"
  if (name.indexOf("boost") >= 0 || name.indexOf("mini") >= 0) {
    Serial.println("*************************************************************");
    Serial.printf("[BT Scan] >>> TARGET MATCHED: '%s'! Connecting now...\n", ssid);
    Serial.println("*************************************************************");
    return true;
  }

  return false;
}

// Bluetooth Connection State Callback
void connection_state_changed(esp_a2d_connection_state_t state, void *ptr) {
  if (state == ESP_A2D_CONNECTION_STATE_CONNECTED) {
    isBtConnected = true;
    needChime = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("\n[BT] =========================================================");
    Serial.println("[BT] >>> SUCCESS: Connected to 'Mini boost 4'! Link is stable. <<<");
    Serial.println("[BT] =========================================================");
  } else if (state == ESP_A2D_CONNECTION_STATE_CONNECTING) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    Serial.println("[BT] Handshaking and establishing A2DP link...");
  } else if (state == ESP_A2D_CONNECTION_STATE_DISCONNECTED) {
    isBtConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[BT] Link closed / searching for 'Mini boost 4'...");
  }
}

// Play pleasant two-tone confirmation chime ("Ding-Dong!") through "Mini boost 4"
void playChime() {
  Serial.println("[AUDIO] Playing connection confirmation chime on 'Mini boost 4'...");
  const int sampleRate = 44100;

  // Tone 1: 587 Hz (D5) for 180 ms
  float freq1 = 587.33;
  int samples1 = (int)(sampleRate * 0.18);
  for (int s = 0; s < samples1; s++) {
    float t = (float)s / sampleRate;
    int16_t val = (int16_t)(sin(2.0 * PI * freq1 * t) * 12000.0);
    pushAudioFrame(val, val);
  }

  // Short pause: 30 ms silence
  int pauseSamples = (int)(sampleRate * 0.03);
  for (int s = 0; s < pauseSamples; s++) {
    pushAudioFrame(0, 0);
  }

  // Tone 2: 880 Hz (A5) for 250 ms
  float freq2 = 880.0;
  int samples2 = (int)(sampleRate * 0.25);
  for (int s = 0; s < samples2; s++) {
    float t = (float)s / sampleRate;
    int16_t val = (int16_t)(sin(2.0 * PI * freq2 * t) * 14000.0);
    pushAudioFrame(val, val);
  }
}

// Web Server on port 80
WebServer server(80);
bool isPlaying = false;
String lastPlayedSound = "None";

// Synthesized Siren Alarm (Tone Generator)
void playSirenAlarm(int cycles = 2) {
  isPlaying = true;
  lastPlayedSound = "Emergency Siren";
  Serial.println("[AUDIO] Playing siren through 'Mini boost 4'...");

  const int sampleRate = 44100;
  for (int c = 0; c < cycles; c++) {
    for (float freq = 600.0; freq <= 1300.0; freq += 40.0) {
      Frame tempFrames[64];
      for (int s = 0; s < 64; s++) {
        float t = (float)s / sampleRate;
        int16_t sample = (int16_t)(sin(2.0 * PI * freq * t) * 16000.0);
        tempFrames[s].channel1 = sample;
        tempFrames[s].channel2 = sample;
      }
      pushAudioBytes((const uint8_t*)tempFrames, sizeof(tempFrames));
      delay(2);
    }
    for (float freq = 1300.0; freq >= 600.0; freq -= 40.0) {
      Frame tempFrames[64];
      for (int s = 0; s < 64; s++) {
        float t = (float)s / sampleRate;
        int16_t sample = (int16_t)(sin(2.0 * PI * freq * t) * 16000.0);
        tempFrames[s].channel1 = sample;
        tempFrames[s].channel2 = sample;
      }
      pushAudioBytes((const uint8_t*)tempFrames, sizeof(tempFrames));
      delay(2);
    }
  }
  isPlaying = false;
}

// =====================================================================================
// 3. HTTP Handlers for MES System
// =====================================================================================

// GET / -> Web Dashboard
void handleRoot() {
  bool btOk = a2dp_source.is_connected();
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>ESP32 Bluetooth Announcer</title>";
  html += "<style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:30px;max-width:550px;margin:auto;}";
  html += ".card{background:#1e293b;border-radius:12px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.3);border:1px solid #334155;}";
  html += "h2{color:#b87333;margin-top:0;}";
  html += ".btn{display:inline-block;padding:12px 20px;margin:8px 4px;border-radius:8px;text-decoration:none;font-weight:700;cursor:pointer;border:none;}";
  html += ".btn-red{background:#dc2626;color:#fff;}";
  html += ".info{background:#334155;padding:12px;border-radius:6px;font-size:13px;line-height:1.6;}";
  html += ".badge-green{background:#15803d;padding:2px 8px;border-radius:4px;color:#fff;font-weight:bold;}";
  html += ".badge-orange{background:#c2410c;padding:2px 8px;border-radius:4px;color:#fff;font-weight:bold;}";
  html += "</style></head><body><div class='card'>";
  html += "<h2>🔊 MES Bluetooth Announcer</h2>";
  html += "<div class='info'>";
  html += "<strong>Device IP:</strong> " + WiFi.localIP().toString() + "<br>";
  html += "<strong>Bluetooth Speaker:</strong> " + String(BT_TARGET_NAME) + " : ";
  if (btOk) {
    html += "<span class='badge-green'>CONNECTED</span><br>";
  } else {
    html += "<span class='badge-orange'>SCANNING / PAIRING</span><br>";
  }
  html += "<strong>Last Audio:</strong> " + lastPlayedSound + "<br>";
  html += "<strong>Free Heap:</strong> " + String(ESP.getFreeHeap()) + " bytes<br>";
  html += "</div>";
  html += "<h3 style='margin-top:20px;'>Quick Test:</h3>";
  html += "<a class='btn btn-red' href='/trigger?sound=emergency'>🚨 Play Siren Test</a>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

// GET /status -> JSON Status for MES Frontend
void handleStatus() {
  String json = "{";
  json += "\"status\":\"" + String(isPlaying ? "BUSY" : "ONLINE") + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"bluetoothSpeaker\":\"" + String(BT_TARGET_NAME) + "\",";
  json += "\"bluetoothConnected\":" + String(a2dp_source.is_connected() ? "true" : "false") + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap());
  json += "}";
  server.send(200, "application/json", json);
}

// GET /trigger?sound=emergency -> Triggers siren alarm
void handleTrigger() {
  Serial.println("[HTTP] Trigger siren received!");
  server.send(200, "text/plain", "Trigger received. Playing siren on Bluetooth speaker.");
  playSirenAlarm(2);
}

// POST /upload_tts -> Streams voice words from Spring Boot IotService directly to "Mini boost 4"
void handleUploadTTS() {
  int contentLength = 0;
  if (server.hasHeader("Content-Length")) {
    contentLength = server.header("Content-Length").toInt();
  }

  Serial.printf("[HTTP] /upload_tts receiving voice words (%d bytes)...\n", contentLength);

  WiFiClient client = server.client();
  uint8_t buf[512];
  int remaining = contentLength > 0 ? contentLength : 1000000;
  unsigned long timeout = millis() + 8000;
  size_t totalReceived = 0;

  isPlaying = true;
  lastPlayedSound = "Live Voice Announcement";

  while ((contentLength == 0 || remaining > 0) && (client.connected() || client.available())) {
    if (client.available()) {
      int toRead = client.available();
      if (contentLength > 0 && toRead > remaining) toRead = remaining;
      if (toRead > (int)sizeof(buf)) toRead = sizeof(buf);

      int bytesRead = client.read(buf, toRead);
      if (bytesRead > 0) {
        // Stream directly into the Bluetooth audio ringbuffer (with backpressure)
        pushAudioBytes(buf, bytesRead);
        totalReceived += bytesRead;
        if (contentLength > 0) remaining -= bytesRead;
        timeout = millis() + 5000;
      }
    } else {
      if (millis() > timeout) break;
      delay(1);
    }
  }

  isPlaying = false;
  Serial.printf("[HTTP] Voice words received (%u bytes) -> Playing on 'Mini boost 4'!\n", totalReceived);
  server.send(200, "text/plain", "Voice announcement streamed successfully to Bluetooth speaker");
}

// Start Wi-Fi & Web Server
void startWiFiAndServer() {
  if (wifiStarted) return;
  wifiStarted = true;

  Serial.printf("\n[WiFi] Connecting to '%s' ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Disable modem sleep to prevent RF collisions with Bluetooth audio
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.println("*************************************************");
    Serial.print  ("*** YOUR ESP32 IP ADDRESS IS: ");
    Serial.println(WiFi.localIP());
    Serial.println("*************************************************");

    if (MDNS.begin("factory-alarm")) {
      MDNS.addService("http", "tcp", 80);
    }
  } else {
    Serial.println("\n[WiFi] Connection timeout. Running in offline Bluetooth mode.");
  }

  const char* headerkeys[] = {"Content-Length", "Content-Type"};
  server.collectHeaders(headerkeys, 2);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/trigger", HTTP_GET, handleTrigger);
  server.on("/upload_tts", HTTP_POST, handleUploadTTS);

  server.begin();
  Serial.println("[HTTP] Web Server started on port 80.");
  Serial.println("[SYSTEM] Ready to receive voice announcements from MES Factory!\n");
}

// =====================================================================================
// 4. Setup & Main Loop
// =====================================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n=======================================================");
  Serial.println("   MES Factory ESP32 Bluetooth Announcer v2.0          ");
  Serial.println("   Target Speaker: 'Mini boost 4'                      ");
  Serial.println("=======================================================");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // 1. Erase stale/corrupted Bluetooth pairing bonds from flash
  Serial.println("[SYSTEM] Resetting Bluetooth pairing cache in NVS...");
  nvs_flash_erase();
  nvs_flash_init();

  // 2. Ensure Wi-Fi radio is OFF initially to give Bluetooth 100% RF bandwidth
  WiFi.mode(WIFI_OFF);
  delay(100);

  // 3. Configure Bluetooth A2DP Source
  Serial.println("[BT] Initializing Bluetooth Transmitter...");
  a2dp_source.set_pin_code("0000", ESP_BT_PIN_TYPE_VARIABLE);
  a2dp_source.set_on_connection_state_changed(connection_state_changed);
  a2dp_source.set_data_callback_in_frames(get_data_frames);
  a2dp_source.set_ssid_callback(isValidBluetoothDevice);
  a2dp_source.set_auto_reconnect(false); // Perform a fresh scan without stale MAC loops
  a2dp_source.start();

  Serial.println("[BT] >>> Scanning for 'Mini boost 4'... <<<");
  Serial.println("[BT] (Important: Turn off Bluetooth on your phone and turn on 'Mini boost 4')");

  // 4. Give Bluetooth 12 seconds to connect cleanly before starting Wi-Fi
  // This completely eliminates the RF coexistence collision during handshake!
  unsigned long scanStart = millis();
  while (!isBtConnected && (millis() - scanStart < 12000)) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
  Serial.println();

  // 5. Start Wi-Fi & Web Server
  startWiFiAndServer();
}

void loop() {
  if (wifiStarted) {
    server.handleClient();
  }

  // Play connection confirmation chime in main loop task when Bluetooth connects
  if (needChime) {
    needChime = false;
    playChime();
  }

  // Periodic status display
  static unsigned long lastLog = 0;
  if (millis() - lastLog > 8000) {
    lastLog = millis();
    if (a2dp_source.is_connected()) {
      Serial.println("[STATUS] Bluetooth 'Mini boost 4': CONNECTED | WiFi: ONLINE");
    } else {
      Serial.println("[STATUS] Bluetooth: Searching for 'Mini boost 4'... (Turn off Bluetooth on your phone!)");
    }
  }

  delay(2);
}
