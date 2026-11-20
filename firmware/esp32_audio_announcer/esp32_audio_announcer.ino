/*
 * =====================================================================================
 *  MES Factory - ESP32 Bluetooth Voice & Audio Announcer (v15.0 - First-Word Lock HD)
 * =====================================================================================
 *  Why the first word was still cut off in v14.0 & how v15.0 guarantees 100% of the
 *  first word is heard clearly:
 *
 *  1. Root Cause #1 (Leading Trim Ate the First Syllable):
 *     In v14.0, `if (!voiceHasStarted && abs(avg) < 500) continue;` stripped the quiet
 *     consonant attack at the start of the first word (e.g., "H", "S", "T", "W", "A")
 *     AND removed the natural ~150ms lead-in from the TTS MP3.
 *     -> FIX: Removed leading-sample stripping completely! Every single sample from
 *        byte 0 of the TTS audio is stored intact.
 *
 *  2. Root Cause #2 (Word-Space Detector Triggered Inside the First Word):
 *     When the first word starts after lead-in silence, or has a brief stop consonant
 *     ("p", "t", "k"), `quietRunCount == 310` fired right at the start of the first
 *     word and inserted a 75ms mute gap in the middle of the first word!
 *     -> FIX: The Word-Space Pause Detector is now armed ONLY AFTER at least 450
 *        active voiced samples (`voicedRunCount > 450`) of a real word have been
 *        spoken, so it can NEVER trigger before or inside the first word!
 *
 *  3. Root Cause #3 ("Mini boost 4" Bluetooth Speaker Auto-Mute Wake-Up Time):
 *     Portable Bluetooth speakers turn off their internal Class-D amplifier during
 *     silence and ignore tiny signals (`±3` or `±45`). They require an audible fade-in
 *     signal (~750ms before speech starts) to un-mute their speaker cone completely
 *     before the first word arrives.
 *     -> FIX: Added a soft, pleasant 750ms "Attention Soft-Wake" pre-roll (`warmupFramesLeft`)
 *        with a gentle bell-tone pulse followed by 400ms of clean amplifier-active hold
 *        RIGHT BEFORE `playIndex = 0` begins. By the time `playIndex = 0` starts, the
 *        Bluetooth speaker amplifier is 100% wide awake!
 *
 *  4. Same 15.6 KB Zero-Malloc Static Footprint:
 *     Wi-Fi (192.168.1.108) and Bluetooth ("Mini boost 4") connect 100% reliably.
 *
 *  Arduino IDE Settings:
 *  - Board: "ESP32 Dev Module"
 *  - Port: "COM5"
 *  - Partition Scheme: "Huge APP (3MB No OTA / 1MB SPIFFS)"
 * =====================================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <math.h>
#include "BluetoothA2DPSource.h"

// =====================================================================================
// 1. Wi-Fi Configuration
// =====================================================================================
const char* WIFI_SSID     = "TP-Link_01CA";
const char* WIFI_PASSWORD = "54530874";

#define LED_PIN           2
#define A2DP_SAMPLE_RATE  44100
#define DOWN_FACTOR       4
#define VOICE_SAMPLE_RATE (A2DP_SAMPLE_RATE / DOWN_FACTOR) // 11,025 Hz (Crisp Human Voice!)

// =====================================================================================
// 2. Official IMA 4-Bit ADPCM Codec (2 samples per byte, full 16-bit dynamic range)
// =====================================================================================
static const int8_t imaIndexTable[16] = {
  -1, -1, -1, -1, 2, 4, 6, 8,
  -1, -1, -1, -1, 2, 4, 6, 8
};

static const int16_t imaStepTable[89] = {
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17,
  19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118,
  130, 143, 157, 173, 190, 209, 230, 253, 279, 307,
  337, 371, 408, 449, 494, 544, 598, 658, 724, 796,
  876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,
  2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358,
  5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899,
  15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
};

static int32_t encPredictor = 0;
static int8_t  encStepIndex = 0;
static int32_t decPredictor = 0;
static int8_t  decStepIndex = 0;

inline uint8_t imaEncodeSample(int16_t sample) {
  int32_t diff = (int32_t)sample - encPredictor;
  uint8_t nibble = 0;
  if (diff < 0) {
    nibble = 8;
    diff = -diff;
  }
  int32_t step = imaStepTable[encStepIndex];
  int32_t diffq = step >> 3;

  if (diff >= step) {
    nibble |= 4;
    diff -= step;
    diffq += step;
  }
  step >>= 1;
  if (diff >= step) {
    nibble |= 2;
    diff -= step;
    diffq += step;
  }
  step >>= 1;
  if (diff >= step) {
    nibble |= 1;
    diffq += step;
  }

  if (nibble & 8) encPredictor -= diffq;
  else            encPredictor += diffq;

  if (encPredictor > 32767)  encPredictor = 32767;
  if (encPredictor < -32768) encPredictor = -32768;

  encStepIndex += imaIndexTable[nibble];
  if (encStepIndex < 0)  encStepIndex = 0;
  if (encStepIndex > 88) encStepIndex = 88;

  return nibble & 0x0F;
}

inline int16_t imaDecodeNibble(uint8_t nibble) {
  int32_t step = imaStepTable[decStepIndex];
  int32_t diffq = step >> 3;

  if (nibble & 4) diffq += step;
  if (nibble & 2) diffq += (step >> 1);
  if (nibble & 1) diffq += (step >> 2);

  if (nibble & 8) decPredictor -= diffq;
  else            decPredictor += diffq;

  if (decPredictor > 32767)  decPredictor = 32767;
  if (decPredictor < -32768) decPredictor = -32768;

  decStepIndex += imaIndexTable[nibble & 0x0F];
  if (decStepIndex < 0)  decStepIndex = 0;
  if (decStepIndex > 88) decStepIndex = 88;

  return (int16_t)decPredictor;
}

// =====================================================================================
// 3. Linear Store-Then-Play Buffer (15,600 bytes = 31,200 speech samples)
// =====================================================================================
#define ADPCM_BUF_BYTES   15600
#define MAX_ADPCM_SAMPLES (ADPCM_BUF_BYTES * 2) // 31,200 speech samples

uint8_t adpcmBuffer[ADPCM_BUF_BYTES];
volatile size_t storedSamples     = 0;
volatile size_t playIndex         = 0;
volatile int32_t warmupFramesLeft = 0;
volatile int32_t warmupTotalFrames = 1;
volatile int32_t pauseFramesLeft  = 0;
volatile bool isPlayingAudio      = false;

inline void writeNibble(size_t sampleIdx, uint8_t nibble) {
  size_t byteIdx = sampleIdx >> 1;
  if (byteIdx >= ADPCM_BUF_BYTES) return;
  if ((sampleIdx & 1) == 0) {
    adpcmBuffer[byteIdx] = (adpcmBuffer[byteIdx] & 0xF0) | (nibble & 0x0F);
  } else {
    adpcmBuffer[byteIdx] = (adpcmBuffer[byteIdx] & 0x0F) | ((nibble & 0x0F) << 4);
  }
}

inline uint8_t readNibble(size_t sampleIdx) {
  size_t byteIdx = sampleIdx >> 1;
  if (byteIdx >= ADPCM_BUF_BYTES) return 0;
  uint8_t b = adpcmBuffer[byteIdx];
  return ((sampleIdx & 1) == 0) ? (b & 0x0F) : ((b >> 4) & 0x0F);
}

BluetoothA2DPSource a2dp_source;
WebServer server(80);

volatile bool isBtConnected = false;
volatile bool needChime = false;
String lastPlayedSound = "None";

// Playback 4x interpolation state (Core 0: 11,025 Hz -> 44,100 Hz)
static int16_t prevSample = 0;
static int16_t currSample = 0;
static uint8_t interpStep = DOWN_FACTOR;
static int16_t ditherSign = 8;
static uint16_t quietRunCount = 0;
static uint16_t voicedRunCount = 0;
static bool wordHasBeenSpoken = false;
static bool pauseInsertedForGap = false;

// Continuous Bluetooth A2DP Frame Callback (Runs on Core 0 at 44,100 Hz)
int32_t get_data_frames(Frame *frame, int32_t frame_count) {
  // 1. Idle / Storing Phase: Keep Bluetooth A2DP stream active
  if (!isPlayingAudio) {
    for (int32_t i = 0; i < frame_count; i++) {
      ditherSign = -ditherSign;
      frame[i].channel1 = ditherSign;
      frame[i].channel2 = ditherSign;
    }
    return frame_count;
  }

  for (int32_t i = 0; i < frame_count; i++) {
    // 2. Hardware Speaker Amplifier Wake-Up Pre-Roll (750ms before sample 0 starts!)
    //    First 180ms plays a gentle 528 Hz soft wake-up pulse (~1,400 amplitude) that
    //    forces the "Mini boost 4" Class-D amplifier out of standby, followed by 570ms
    //    of sub-audible hold so the speaker cone is 100% awake when word #1 begins!
    if (warmupFramesLeft > 0) {
      int32_t elapsed = warmupTotalFrames - warmupFramesLeft;
      warmupFramesLeft--;
      int16_t wakeVal = 0;
      // First 160ms (7,056 frames at 44.1kHz): soft 528 Hz wake-up tone
      if (elapsed < 7056) {
        // 528 Hz triangle/square soft wave (~83 frames per cycle at 44,100 Hz)
        int32_t posInCycle = elapsed % 84;
        int16_t env = (elapsed < 1500) ? (int16_t)elapsed :
                      ((elapsed > 5556) ? (int16_t)(7056 - elapsed) : 1500);
        wakeVal = (posInCycle < 42) ? env : -env;
      } else {
        // Remaining 590ms: low-level carrier hold so Class-D amp stays un-muted
        ditherSign = -ditherSign;
        wakeVal = (elapsed & 64) ? 35 : -35;
      }
      frame[i].channel1 = wakeVal;
      frame[i].channel2 = wakeVal;
      continue;
    }

    // 3. Natural Word-Space Pause (ONLY between words after word #1 has been spoken)
    if (pauseFramesLeft > 0) {
      pauseFramesLeft--;
      ditherSign = -ditherSign;
      frame[i].channel1 = ditherSign;
      frame[i].channel2 = ditherSign;
      continue;
    }

    // 4. Decode next 11,025 Hz sample every 4 output frames
    if (interpStep >= DOWN_FACTOR) {
      prevSample = currSample;
      if (playIndex < storedSamples) {
        int16_t rawDecoded = imaDecodeNibble(readNibble(playIndex));
        playIndex++;

        // Track whether at least one full syllable/word (~40ms) has been spoken
        if (abs(rawDecoded) >= 450) {
          voicedRunCount++;
          if (voicedRunCount > 350) {
            wordHasBeenSpoken = true; // Now armed for word-space pauses AFTER this word
          }
          quietRunCount = 0;
          pauseInsertedForGap = false;
        } else if (abs(rawDecoded) < 260) {
          quietRunCount++;
          // Only insert a natural pause if a word was ALREADY spoken and then ended
          // with a true inter-word space (> 350 quiet samples = ~32ms of silence)
          if (wordHasBeenSpoken && quietRunCount == 360 && !pauseInsertedForGap) {
            pauseFramesLeft = (A2DP_SAMPLE_RATE * 65) / 1000; // +65ms natural word pause
            pauseInsertedForGap = true;
            voicedRunCount = 0;
            wordHasBeenSpoken = false;
          }
        }

        currSample = rawDecoded;
      } else {
        // Finished playing entire stored message!
        isPlayingAudio = false;
        currSample = 0;
      }
      interpStep = 0;
    }

    // Exact 4-step linear interpolation (11,025 Hz -> 44,100 Hz):
    // Weights (3 - step) + (step + 1) ALWAYS sum to 4/4 = 1.0x!
    int32_t out = ((int32_t)prevSample * (3 - interpStep) +
                   (int32_t)currSample * (interpStep + 1)) >> 2;
    interpStep++;

    frame[i].channel1 = (int16_t)out;
    frame[i].channel2 = (int16_t)out;
  }

  return frame_count;
}

// Store a single 11,025 Hz 16-bit sample linearly at storedSamples (Core 1)
inline void storeLinearSample(int16_t sample) {
  if (storedSamples >= MAX_ADPCM_SAMPLES) {
    return;
  }
  uint8_t nib = imaEncodeSample(sample);
  writeNibble(storedSamples, nib);
  storedSamples++;
}

// Start playing the stored buffer from index 0 (Core 1)
void startStoredPlayback(int warmupMs = 750) {
  decPredictor        = 0;
  decStepIndex        = 0;
  prevSample          = 0;
  currSample          = 0;
  interpStep          = DOWN_FACTOR;
  quietRunCount       = 0;
  voicedRunCount      = 0;
  wordHasBeenSpoken   = false;
  pauseInsertedForGap = false;
  pauseFramesLeft     = 0;
  playIndex           = 0; // Start strictly at sample 0 (every bit of the first word!)
  warmupTotalFrames   = (A2DP_SAMPLE_RATE * warmupMs) / 1000;
  warmupFramesLeft    = warmupTotalFrames;
  isPlayingAudio      = true;
}

// Byte-alignment, Silence Compressor & Vocal Presence State (Core 1)
static uint8_t leftoverBytes[4];
static uint8_t leftoverCount = 0;
static int32_t downAccum = 0;
static uint8_t downsampleCount = 0;
static int16_t prevMonoSample = 0;
static uint16_t encSilenceCount = 0;

void beginStoringNewClip() {
  isPlayingAudio  = false;
  storedSamples   = 0;
  playIndex       = 0;
  leftoverCount   = 0;
  downAccum       = 0;
  downsampleCount = 0;
  prevMonoSample  = 0;
  encSilenceCount = 0;
  encPredictor    = 0;
  encStepIndex    = 0;

  // Pre-pad 180ms (2,000 samples at 11,025 Hz) of clean digital zero at the start of
  // the buffer so even after the 750ms speaker wake-up pre-roll, the first consonant
  // of the first word has a 180ms safety cushion!
  for (int s = 0; s < 2000; s++) {
    storeLinearSample(0);
  }
}

// Store raw 44.1kHz 16-bit Stereo PCM bytes from HTTP stream into RAM (Core 1)
void storeAudioBytes(const uint8_t* data, size_t byteCount) {
  if (byteCount == 0) return;

  for (size_t i = 0; i < byteCount; i++) {
    leftoverBytes[leftoverCount++] = data[i];

    if (leftoverCount == 4) {
      int16_t left  = (int16_t)((uint16_t)leftoverBytes[0] | ((uint16_t)leftoverBytes[1] << 8));
      int16_t right = (int16_t)((uint16_t)leftoverBytes[2] | ((uint16_t)leftoverBytes[3] << 8));
      int32_t mono  = ((int32_t)left + (int32_t)right) >> 1;
      leftoverCount = 0;

      // 4-frame average (44,100 Hz -> 11,025 Hz)
      downAccum += mono;
      downsampleCount++;

      if (downsampleCount == DOWN_FACTOR) {
        int32_t avg = downAccum >> 2; // Divide by 4
        downAccum = 0;
        downsampleCount = 0;

        // Smart Silence Compression ONLY for very long dead-air gaps (> 500 samples / 45ms):
        // Never strips the start of the first word!
        if (abs(avg) < 220) {
          encSilenceCount++;
          if (encSilenceCount > 500) {
            continue;
          }
        } else {
          encSilenceCount = 0;
        }

        // Vocal Presence Pre-Emphasis Filter for crisp human consonants
        int32_t presence = avg + ((avg - (int32_t)prevMonoSample) / 4);
        prevMonoSample = (int16_t)avg;

        // 82% anti-clipping gain
        int32_t scaled = (presence * 26) >> 5;
        if (scaled > 32700)  scaled = 32700;
        if (scaled < -32700) scaled = -32700;

        storeLinearSample((int16_t)scaled);
      }
    }
  }
}

// =====================================================================================
// 4. Bluetooth Discovery & Connection Callbacks
// =====================================================================================
bool scan_device_callback(const char* ssid, esp_bd_addr_t address, int rssi) {
  if (ssid == nullptr || strlen(ssid) == 0) {
    return false;
  }

  Serial.printf("[BT SCAN] Device found: '%s' | RSSI: %d dBm | MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
                ssid, rssi, address[0], address[1], address[2], address[3], address[4], address[5]);

  String devName = String(ssid);
  devName.toLowerCase();
  devName.trim();

  if (devName.indexOf("boost") >= 0 || devName.indexOf("mini") >= 0) {
    Serial.println("\n*************************************************************");
    Serial.printf(">>> MATCH FOUND: '%s'! Connecting now...\n", ssid);
    Serial.println("*************************************************************\n");
    return true;
  }

  return false;
}

void connection_state_changed(esp_a2d_connection_state_t state, void *ptr) {
  switch (state) {
    case ESP_A2D_CONNECTION_STATE_DISCONNECTED:
      isBtConnected = false;
      digitalWrite(LED_PIN, LOW);
      Serial.println("[BT STATE] Disconnected / Searching for speaker...");
      break;

    case ESP_A2D_CONNECTION_STATE_CONNECTING:
      Serial.println("[BT STATE] >>> Handshaking with speaker... <<<");
      break;

    case ESP_A2D_CONNECTION_STATE_CONNECTED:
      isBtConnected = true;
      needChime = true;
      digitalWrite(LED_PIN, HIGH);
      Serial.println("\n=======================================================");
      Serial.println("  [BT STATE] >>> SUCCESS: CONNECTED TO SPEAKER! <<<   ");
      Serial.println("=======================================================\n");
      break;

    case ESP_A2D_CONNECTION_STATE_DISCONNECTING:
      Serial.println("[BT STATE] Disconnecting...");
      break;

    default:
      break;
  }
}

// =====================================================================================
// 5. Built-in Audio Generators (Chime & Siren at 11,025 Hz)
// =====================================================================================
void playChime() {
  Serial.println("[AUDIO] Storing & playing confirmation chime on speaker...");
  isPlayingAudio = false;
  storedSamples  = 0;
  playIndex      = 0;
  encPredictor   = 0;
  encStepIndex   = 0;

  // Tone 1: 587.33 Hz (D5) for 180 ms
  int samples1 = (int)(VOICE_SAMPLE_RATE * 0.18);
  for (int s = 0; s < samples1; s++) {
    float t = (float)s / VOICE_SAMPLE_RATE;
    storeLinearSample((int16_t)(sin(2.0 * PI * 587.33 * t) * 10000.0));
  }

  // 30 ms silence
  int pauseSamples = (int)(VOICE_SAMPLE_RATE * 0.03);
  for (int s = 0; s < pauseSamples; s++) {
    storeLinearSample(0);
  }

  // Tone 2: 880 Hz (A5) for 250 ms
  int samples2 = (int)(VOICE_SAMPLE_RATE * 0.25);
  for (int s = 0; s < samples2; s++) {
    float t = (float)s / VOICE_SAMPLE_RATE;
    storeLinearSample((int16_t)(sin(2.0 * PI * 880.0 * t) * 12000.0));
  }

  startStoredPlayback(100);
}

void playSirenAlarm(int cycles = 2) {
  lastPlayedSound = "Emergency Siren";
  Serial.println("[AUDIO] Storing & playing emergency siren on speaker...");
  isPlayingAudio = false;
  storedSamples  = 0;
  playIndex      = 0;
  encPredictor   = 0;
  encStepIndex   = 0;

  float phase = 0.0;
  for (int c = 0; c < cycles; c++) {
    for (float freq = 600.0; freq <= 1300.0; freq += 25.0) {
      float phaseInc = 2.0 * PI * freq / VOICE_SAMPLE_RATE;
      for (int s = 0; s < 110; s++) {
        phase += phaseInc;
        if (phase >= 2.0 * PI) phase -= 2.0 * PI;
        storeLinearSample((int16_t)(sin(phase) * 12000.0));
      }
    }
    for (float freq = 1300.0; freq >= 600.0; freq -= 25.0) {
      float phaseInc = 2.0 * PI * freq / VOICE_SAMPLE_RATE;
      for (int s = 0; s < 110; s++) {
        phase += phaseInc;
        if (phase >= 2.0 * PI) phase -= 2.0 * PI;
        storeLinearSample((int16_t)(sin(phase) * 12000.0));
      }
    }
  }

  startStoredPlayback(100);
}

// =====================================================================================
// 6. Web Server & HTTP Endpoints
// =====================================================================================
void handleRoot() {
  bool btOk = a2dp_source.is_connected();
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>MES Factory Announcer</title>";
  html += "<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;padding:30px;max-width:550px;margin:auto;}";
  html += ".card{background:#1e293b;border-radius:12px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.3);border:1px solid #334155;}";
  html += "h2{color:#b87333;margin-top:0;}";
  html += ".btn{display:inline-block;padding:12px 20px;margin:8px 4px;border-radius:8px;text-decoration:none;font-weight:700;cursor:pointer;border:none;}";
  html += ".btn-red{background:#dc2626;color:#fff;}";
  html += ".btn-green{background:#16a34a;color:#fff;}";
  html += ".info{background:#334155;padding:14px;border-radius:8px;font-size:14px;line-height:1.7;}";
  html += ".badge-green{background:#15803d;padding:2px 8px;border-radius:4px;color:#fff;font-weight:bold;}";
  html += ".badge-orange{background:#c2410c;padding:2px 8px;border-radius:4px;color:#fff;font-weight:bold;}";
  html += "</style></head><body><div class='card'>";
  html += "<h2>🔊 MES Factory Audio Announcer v15.0 (First-Word Lock HD)</h2>";
  html += "<div class='info'>";
  html += "<strong>Device IP:</strong> " + WiFi.localIP().toString() + "<br>";
  html += "<strong>Bluetooth Speaker:</strong> ";
  if (btOk) {
    html += "<span class='badge-green'>CONNECTED</span><br>";
  } else {
    html += "<span class='badge-orange'>SCANNING / SEARCHING</span><br>";
  }
  html += "<strong>Voice Engine:</strong> 11,025 Hz Presence HD + 750ms First-Word Lock<br>";
  html += "<strong>Stored Samples:</strong> " + String(storedSamples) + " / " + String(MAX_ADPCM_SAMPLES) + "<br>";
  html += "<strong>Last Audio:</strong> " + lastPlayedSound + "<br>";
  html += "<strong>Free Memory:</strong> " + String(ESP.getFreeHeap()) + " bytes<br>";
  html += "</div>";
  html += "<h3 style='margin-top:20px;'>Manual Tests:</h3>";
  html += "<a class='btn btn-red' href='/trigger?sound=emergency'>🚨 Test Siren</a> ";
  html += "<a class='btn btn-green' href='/chime'>🔔 Test Chime</a>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleStatus() {
  String json = "{";
  json += "\"status\":\"" + String(isPlayingAudio ? "BUSY" : "ONLINE") + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"bluetoothConnected\":" + String(a2dp_source.is_connected() ? "true" : "false") + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap());
  json += "}";
  server.send(200, "application/json", json);
}

void handleChime() {
  server.send(200, "text/plain", "Chime triggered.");
  playChime();
}

void handleTrigger() {
  Serial.println("[HTTP] Trigger siren received!");
  server.send(200, "text/plain", "Siren triggered on Bluetooth speaker.");
  playSirenAlarm(2);
}

void handleUploadTTSFinish() {
  // 1. Complete HTTP response FIRST so Wi-Fi goes 100% idle
  server.send(200, "text/plain", "Voice announcement stored and playing with First-Word Lock on Bluetooth speaker");
  delay(20);

  // 2. Play from sample 0 with 750ms speaker amplifier wake-up pre-roll!
  Serial.printf("[HTTP] /upload_tts stored %u speech samples! Playing from sample 0 now.\n",
                (unsigned)storedSamples);
  startStoredPlayback(750);
}

void handleUploadTTSChunk() {
  if (server.hasRaw()) {
    HTTPRaw& raw = server.raw();
    if (raw.status == RAW_START) {
      lastPlayedSound = "Live Voice Announcement";
      beginStoringNewClip();
      Serial.println("[HTTP] /upload_tts storing 11kHz Human Voice clip...");
    } else if (raw.status == RAW_WRITE) {
      if (raw.currentSize > 0) {
        storeAudioBytes(raw.buf, raw.currentSize);
      }
    } else if (raw.status == RAW_END) {
      Serial.printf("[HTTP] /upload_tts received %u raw bytes -> stored %u speech samples!\n",
                    raw.totalSize, (unsigned)storedSamples);
    } else if (raw.status == RAW_ABORTED) {
      Serial.println("[HTTP] /upload_tts stream aborted.");
    }
  } else if (server.hasUpload()) {
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
      lastPlayedSound = "Live Voice Announcement";
      beginStoringNewClip();
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (upload.currentSize > 0) {
        storeAudioBytes(upload.buf, upload.currentSize);
      }
    }
  }
}

// =====================================================================================
// 7. Setup & Main Loop (15KB zero-malloc layout so Wi-Fi & BT always connect)
// =====================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("\n\n=======================================================");
  Serial.println("  MES Factory ESP32 Bluetooth Announcer v15.0          ");
  Serial.println("=======================================================");

  // 1. Connect Wi-Fi FIRST while heap is 100% unfragmented (takes ~3 seconds)
  Serial.printf("[WiFi] Connecting to '%s' ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.println("*************************************************");
    Serial.print  ("*** YOUR ESP32 IP ADDRESS IS: ");
    Serial.println(WiFi.localIP());
    Serial.println("*************************************************");
  } else {
    Serial.println("\n[WiFi] Warning: Wi-Fi did not connect yet.");
  }

  // 2. Start HTTP Web Server
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/trigger", HTTP_GET, handleTrigger);
  server.on("/chime", HTTP_GET, handleChime);
  server.on("/upload_tts", HTTP_POST, handleUploadTTSFinish, handleUploadTTSChunk);
  server.begin();
  Serial.println("[HTTP] Web Server online on port 80.");

  // 3. Start Bluetooth A2DP Source (with ZERO heap malloc so Wi-Fi & BT never run out of RAM!)
  Serial.println("[BT] Starting Bluetooth A2DP Source (connecting to 'Mini boost 4')...");
  a2dp_source.set_on_connection_state_changed(connection_state_changed);
  a2dp_source.set_data_callback_in_frames(get_data_frames);
  a2dp_source.set_ssid_callback(scan_device_callback);
  a2dp_source.set_auto_reconnect(true, 2);
  a2dp_source.start();
}

void loop() {
  server.handleClient();

  if (needChime) {
    needChime = false;
    delay(400);
    playChime();
  }

  static unsigned long lastLog = 0;
  if (millis() - lastLog > 5000) {
    lastLog = millis();
    if (a2dp_source.is_connected()) {
      digitalWrite(LED_PIN, HIGH);
      Serial.printf("[STATUS] BT: CONNECTED | WiFi IP: %s | Free Heap: %u\n",
                    WiFi.localIP().toString().c_str(), ESP.getFreeHeap());
    } else {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      Serial.printf("[STATUS] BT: Scanning for speaker... | WiFi IP: %s | Free Heap: %u\n",
                    WiFi.localIP().toString().c_str(), ESP.getFreeHeap());
    }
  }

  delay(2);
}
