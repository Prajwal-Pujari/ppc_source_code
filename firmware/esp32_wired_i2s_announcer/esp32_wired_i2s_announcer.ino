/*
 * =====================================================================================
 *  MES Factory - ESP32 WIRED I2S Audio Announcer (MAX98357A on D25, D26, D27)
 * =====================================================================================
 *  Why Wired I2S is 100x better than Bluetooth A2DP:
 *  - Bluetooth is completely OFF -> 180+ KB free RAM & ZERO 2.4 GHz antenna conflicts!
 *  - Streams FULL CD-Quality 44,100 Hz 16-bit Stereo PCM directly over Wi-Fi into the
 *    ESP32 hardware I2S DMA engine -> crystal-clear real human voice, ZERO cracking,
 *    ZERO first-word cutoff, and unlimited announcement length!
 *
 *  Jumper Wire Connections (ESP32 DevKit V1 -> MAX98357A I2S Amplifier):
 *  - D25 (GPIO 25) -> LRC  (Word Select / Left-Right Clock)
 *  - D26 (GPIO 26) -> BCLK (Bit Clock)
 *  - D27 (GPIO 27) -> DIN  (Digital Audio Data In)
 *  - VIN (5V)      -> VIN  (Amplifier Power)
 *  - GND           -> GND  (Common Ground)
 *  - Amplifier (+/-) -> 4 Ohm or 8 Ohm Wired Speaker
 *
 *  Arduino IDE Settings:
 *  - Board: "ESP32 Dev Module"
 *  - Port: "COM5" (or your ESP32 COM port)
 *  - Partition Scheme: "Default 4MB with spiffs" (No Huge APP needed since BT is off!)
 * =====================================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <math.h>
#include "driver/i2s.h"

// =====================================================================================
// 1. Wi-Fi & I2S Pin Configuration (D25, D26, D27)
// =====================================================================================
const char* WIFI_SSID     = "TP-Link_01CA";
const char* WIFI_PASSWORD = "54530874";

#define I2S_PORT        I2S_NUM_0
#define I2S_PIN_LRC     25   // D25 -> MAX98357A LRC
#define I2S_PIN_BCLK    26   // D26 -> MAX98357A BCLK
#define I2S_PIN_DOUT    27   // D27 -> MAX98357A DIN
#define LED_PIN         2

#define SAMPLE_RATE     44100
// Software volume gain (1.0 = normal, 2.2 = ~2.2x louder with anti-clipping clamp!)
#define AUDIO_GAIN      2.2f

WebServer server(80);
String lastPlayedSound = "None";

// =====================================================================================
// 2. Initialize ESP32 Hardware I2S DMA (44.1 kHz, 16-Bit Stereo -> MAX98357A)
// =====================================================================================
void setupI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 16,      // 16 smooth DMA buffers (~185ms hardware buffer!)
    .dma_buf_len = 512,
    .use_apll = false,
    .tx_desc_auto_clear = true, // Automatically outputs pure silence when idle!
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_PIN_BCLK,    // D26
    .ws_io_num = I2S_PIN_LRC,      // D25
    .data_out_num = I2S_PIN_DOUT,  // D27
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("[I2S] Wired Amplifier Ready on D25(LRC), D26(BCLK), D27(DIN) @ 44,100 Hz!");
}

// =====================================================================================
// 3. Built-in Tone Generators (Chime & Emergency Siren directly to Wired Speaker)
// =====================================================================================
void playTone(float freqHz, int durationMs, float amplitude = 9000.0f) {
  const int totalSamples = (SAMPLE_RATE * durationMs) / 1000;
  int16_t chunk[256 * 2]; // 256 stereo frames
  int sampleIdx = 0;

  while (sampleIdx < totalSamples) {
    int count = min(256, totalSamples - sampleIdx);
    for (int i = 0; i < count; i++) {
      float t = (float)(sampleIdx + i) / (float)SAMPLE_RATE;
      int16_t val = (freqHz > 0.0f) ? (int16_t)(sinf(2.0f * PI * freqHz * t) * amplitude) : 0;
      chunk[i * 2]     = val; // Left
      chunk[i * 2 + 1] = val; // Right
    }
    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, chunk, count * 4, &bytesWritten, portMAX_DELAY);
    sampleIdx += count;
  }
}

void playChime() {
  lastPlayedSound = "Confirmation Chime";
  Serial.println("[AUDIO] Playing chime on wired speaker...");
  playTone(587.33f, 160, 22000.0f); // D5
  playTone(0.0f,     40, 0.0f);     // Pause
  playTone(880.0f,  240, 25000.0f); // A5
  i2s_zero_dma_buffer(I2S_PORT);
}

void playSirenAlarm(int cycles = 2) {
  lastPlayedSound = "Emergency Siren";
  Serial.println("[AUDIO] Playing emergency siren on wired speaker...");
  int16_t buf[128 * 2];
  float phase = 0.0f;

  for (int c = 0; c < cycles; c++) {
    for (float freq = 600.0f; freq <= 1350.0f; freq += 18.0f) {
      float inc = 2.0f * PI * freq / (float)SAMPLE_RATE;
      for (int i = 0; i < 128; i++) {
        phase += inc;
        if (phase >= 2.0f * PI) phase -= 2.0f * PI;
        int16_t v = (int16_t)(sinf(phase) * 28000.0f);
        buf[i * 2] = v;
        buf[i * 2 + 1] = v;
      }
      size_t bw = 0;
      i2s_write(I2S_PORT, buf, sizeof(buf), &bw, portMAX_DELAY);
    }
    for (float freq = 1350.0f; freq >= 600.0f; freq -= 18.0f) {
      float inc = 2.0f * PI * freq / (float)SAMPLE_RATE;
      for (int i = 0; i < 128; i++) {
        phase += inc;
        if (phase >= 2.0f * PI) phase -= 2.0f * PI;
        int16_t v = (int16_t)(sinf(phase) * 28000.0f);
        buf[i * 2] = v;
        buf[i * 2 + 1] = v;
      }
      size_t bw = 0;
      i2s_write(I2S_PORT, buf, sizeof(buf), &bw, portMAX_DELAY);
    }
  }
  i2s_zero_dma_buffer(I2S_PORT);
}

// =====================================================================================
// 4. Live Wi-Fi -> I2S 44.1 kHz Stereo PCM Stream Handler (With Safe Boost & Clamp!)
// =====================================================================================
static uint8_t leftoverBytes[4];
static uint8_t leftoverCount = 0;
static int16_t scaledBuf[1024]; // Reusable chunk buffer for gain scaling

inline int16_t boostAndClamp(int16_t sample) {
  int32_t boosted = (int32_t)((float)sample * AUDIO_GAIN);
  if (boosted > 32767)  return 32767;
  if (boosted < -32768) return -32768;
  return (int16_t)boosted;
}

void streamPcmToI2S(const uint8_t* data, size_t len) {
  size_t idx = 0;

  // Complete any partial 4-byte stereo frame from previous TCP packet
  if (leftoverCount > 0) {
    while (leftoverCount < 4 && idx < len) {
      leftoverBytes[leftoverCount++] = data[idx++];
    }
    if (leftoverCount == 4) {
      int16_t frame[2];
      frame[0] = boostAndClamp((int16_t)(leftoverBytes[0] | (leftoverBytes[1] << 8)));
      frame[1] = boostAndClamp((int16_t)(leftoverBytes[2] | (leftoverBytes[3] << 8)));
      size_t bw = 0;
      i2s_write(I2S_PORT, frame, 4, &bw, portMAX_DELAY);
      leftoverCount = 0;
    }
  }

  // Stream aligned 16-bit stereo PCM samples directly into I2S DMA
  size_t remaining = len - idx;
  size_t alignedBytes = remaining & ~((size_t)3); // Multiple of 4 bytes (L16 + R16)
  size_t offset = 0;

  while (offset < alignedBytes) {
    size_t chunkBytes = min((size_t)sizeof(scaledBuf), alignedBytes - offset);
    size_t sampleCount = chunkBytes >> 1;
    const int16_t* src = (const int16_t*)(data + idx + offset);
    for (size_t s = 0; s < sampleCount; s++) {
      scaledBuf[s] = boostAndClamp(src[s]);
    }
    size_t bw = 0;
    i2s_write(I2S_PORT, scaledBuf, chunkBytes, &bw, portMAX_DELAY);
    offset += chunkBytes;
  }

  idx += alignedBytes;
  while (idx < len && leftoverCount < 4) {
    leftoverBytes[leftoverCount++] = data[idx++];
  }
}

void handleUploadTTSFinish() {
  i2s_zero_dma_buffer(I2S_PORT);
  server.send(200, "text/plain", "44.1 kHz HD voice played on wired I2S speaker.");
  Serial.println("[HTTP] /upload_tts finished playing on wired speaker.");
}

void handleUploadTTSChunk() {
  if (server.hasRaw()) {
    HTTPRaw& raw = server.raw();
    if (raw.status == RAW_START) {
      lastPlayedSound = "Live Wi-Fi Voice Announcement";
      leftoverCount = 0;
      digitalWrite(LED_PIN, HIGH);
      Serial.println("[HTTP] /upload_tts streaming live 44.1 kHz PCM to wired speaker...");
    } else if (raw.status == RAW_WRITE) {
      if (raw.currentSize > 0) {
        streamPcmToI2S(raw.buf, raw.currentSize);
      }
    } else if (raw.status == RAW_END) {
      i2s_zero_dma_buffer(I2S_PORT);
      digitalWrite(LED_PIN, LOW);
      Serial.printf("[HTTP] /upload_tts played %u raw PCM bytes!\n", raw.totalSize);
    } else if (raw.status == RAW_ABORTED) {
      i2s_zero_dma_buffer(I2S_PORT);
      digitalWrite(LED_PIN, LOW);
    }
  }
}

// =====================================================================================
// 5. Web Server Endpoints (100% Compatible with IotService.java!)
// =====================================================================================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>ESP32 Wired I2S Speaker</title>";
  html += "<style>body{font-family:system-ui,sans-serif;background:#FAF7F2;color:#18181B;padding:30px;max-width:540px;margin:auto;}";
  html += ".card{background:#fff;border-radius:12px;padding:24px;border:1px solid #DDD6C8;}";
  html += "h2{color:#B87333;margin-top:0;} .btn{display:inline-block;padding:10px 18px;margin:6px 4px;border-radius:8px;text-decoration:none;font-weight:600;color:#fff;}";
  html += ".btn-red{background:#dc2626;} .btn-green{background:#15803d;}</style></head><body><div class='card'>";
  html += "<h2>🔊 ESP32 Wired I2S Speaker (D25 / D26 / D27)</h2>";
  html += "<p><strong>IP Address:</strong> " + WiFi.localIP().toString() + "<br>";
  html += "<strong>Audio Engine:</strong> 44,100 Hz 16-bit I2S DMA (MAX98357A)<br>";
  html += "<strong>Pins:</strong> D25=LRC, D26=BCLK, D27=DIN<br>";
  html += "<strong>Last Audio:</strong> " + lastPlayedSound + "<br>";
  html += "<strong>Free Heap:</strong> " + String(ESP.getFreeHeap()) + " bytes</p>";
  html += "<a class='btn btn-red' href='/trigger?sound=emergency'>Test Siren</a> ";
  html += "<a class='btn btn-green' href='/chime'>Test Chime</a></div></body></html>";
  server.send(200, "text/html", html);
}

void handleStatus() {
  String json = "{\"status\":\"ONLINE\",\"mode\":\"WIRED_I2S\",\"ip\":\"" + WiFi.localIP().toString() + "\",\"freeHeap\":" + String(ESP.getFreeHeap()) + "}";
  server.send(200, "application/json", json);
}

void handleTrigger() {
  String sound = server.hasArg("sound") ? server.arg("sound") : "emergency";
  server.send(200, "text/plain", "Triggered " + sound + " on wired I2S speaker.");
  if (sound == "chime") {
    playChime();
  } else {
    playSirenAlarm(2);
  }
}

void handleChime() {
  server.send(200, "text/plain", "Chime played.");
  playChime();
}

// =====================================================================================
// 6. Setup & Loop
// =====================================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("\n=======================================================");
  Serial.println("  MES Factory - ESP32 Wired I2S Announcer (D25/26/27)  ");
  Serial.println("=======================================================");

  setupI2S();

  Serial.printf("[WiFi] Connecting to '%s' ...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Maximum Wi-Fi speed (no Bluetooth radio sharing!)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  digitalWrite(LED_PIN, HIGH);
  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] ESP32 WIRED SPEAKER IP: ");
  Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/trigger", HTTP_GET, handleTrigger);
  server.on("/chime", HTTP_GET, handleChime);
  server.on("/upload_tts", HTTP_POST, handleUploadTTSFinish, handleUploadTTSChunk);
  server.begin();
  Serial.println("[HTTP] Server online on port 80.");

  // Play startup chime so you know the wired speaker & amplifier are working!
  playChime();
}

void loop() {
  server.handleClient();
  delay(1);
}
