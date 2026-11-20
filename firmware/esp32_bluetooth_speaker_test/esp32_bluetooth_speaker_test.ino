/*
 * =====================================================================================
 *  MES Factory - ESP32 Dedicated Bluetooth Diagnostic & Connection Test
 * =====================================================================================
 *  100% Focused on Bluetooth. No Wi-Fi. No WebServer.
 *  
 *  What this sketch does:
 *  1. Scans and logs EVERY Bluetooth device found nearby (Name, Signal, MAC).
 *  2. Intelligently matches "Mini boost 4" (case-insensitive, trims extra spaces).
 *  3. Connects and logs the exact Bluetooth handshaking states.
 *  4. Plays a continuous audible test tone once connected so you know it works!
 * 
 *  Arduino IDE Settings:
 *  - Board: "ESP32 Dev Module"
 *  - Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"  <-- IMPORTANT!
 *  - Library: "ESP32-A2DP" by Phil Schatzmann
 * =====================================================================================
 */

#include <Arduino.h>
#include <math.h>
#include "BluetoothA2DPSource.h"

#define LED_PIN         2
#define SAMPLE_RATE     44100

// Target speaker keyword
const char* TARGET_KEYWORD = "boost"; // Matches "Mini boost 4", "mini boost", etc.

BluetoothA2DPSource a2dp_source;

volatile bool isConnected = false;

// 1. Audio Stream Callback: Plays a repeating test tone through the speaker
int32_t get_sound_data(Frame *data, int32_t len) {
  static float phase = 0.0;
  static float freq = 880.0; // 880 Hz tone (A5)
  static unsigned long lastToggle = 0;
  static bool toneOn = true;

  // Toggle tone on/off every 500ms (beeping effect)
  if (millis() - lastToggle > 500) {
    lastToggle = millis();
    toneOn = !toneOn;
  }

  float phaseInc = 2.0 * PI * freq / SAMPLE_RATE;

  for (int i = 0; i < len; i++) {
    if (toneOn) {
      phase += phaseInc;
      if (phase >= 2.0 * PI) phase -= 2.0 * PI;
      int16_t sample = (int16_t)(sin(phase) * 12000.0);
      data[i].channel1 = sample; // Left
      data[i].channel2 = sample; // Right
    } else {
      data[i].channel1 = 0;
      data[i].channel2 = 0;
    }
  }

  return len;
}

// 2. Bluetooth Device Scanner Callback:
// Logs EVERY device discovered in the air and matches target
bool scan_device_callback(const char* ssid, esp_bd_addr_t address, int rssi) {
  if (ssid == nullptr || strlen(ssid) == 0) {
    // Hidden or unnamed device
    Serial.printf("[BT SCAN] Unnamed device found | MAC: %02X:%02X:%02X:%02X:%02X:%02X | RSSI: %d dBm\n",
                  address[0], address[1], address[2], address[3], address[4], address[5], rssi);
    return false;
  }

  Serial.printf("[BT SCAN] Device found: '%s' | RSSI: %d dBm | MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
                ssid, rssi, address[0], address[1], address[2], address[3], address[4], address[5]);

  String devName = String(ssid);
  devName.toLowerCase();
  devName.trim();

  // Check if device matches target keyword
  if (devName.indexOf("boost") >= 0 || devName.indexOf("mini") >= 0) {
    Serial.println("\n*************************************************************");
    Serial.printf(">>> MATCH FOUND: '%s'! Attempting connection...\n", ssid);
    Serial.println("*************************************************************\n");
    return true; // Tells ESP32 to connect to this device!
  }

  return false;
}

// 3. Connection State Change Callback
void connection_state_changed(esp_a2d_connection_state_t state, void *ptr) {
  switch (state) {
    case ESP_A2D_CONNECTION_STATE_DISCONNECTED:
      isConnected = false;
      digitalWrite(LED_PIN, LOW);
      Serial.println("\n[BT STATE] Disconnected / Searching for speaker...");
      break;

    case ESP_A2D_CONNECTION_STATE_CONNECTING:
      Serial.println("\n[BT STATE] >>> Handshaking with speaker... <<<");
      break;

    case ESP_A2D_CONNECTION_STATE_CONNECTED:
      isConnected = true;
      digitalWrite(LED_PIN, HIGH);
      Serial.println("\n=======================================================");
      Serial.println("  [BT STATE] >>> SUCCESS: CONNECTED TO SPEAKER! <<<   ");
      Serial.println("  Streaming test beeps now... Listen to your speaker!  ");
      Serial.println("=======================================================\n");
      break;

    case ESP_A2D_CONNECTION_STATE_DISCONNECTING:
      Serial.println("\n[BT STATE] Disconnecting...");
      break;

    default:
      Serial.printf("\n[BT STATE] State code: %d\n", (int)state);
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("\n\n=======================================================");
  Serial.println("  ESP32 Bluetooth Speaker Connection Diagnostic Tool   ");
  Serial.println("=======================================================");
  Serial.println("Target: Any speaker with 'boost' or 'mini' in its name");
  Serial.println("-------------------------------------------------------");
  Serial.println("CHECKLIST BEFORE STARTING:");
  Serial.println("1. Turn OFF Bluetooth on your phone and laptop.");
  Serial.println("2. Turn ON the 'Mini boost 4' speaker.");
  Serial.println("3. Ensure the speaker says 'Bluetooth mode' or 'Pairing'.");
  Serial.println("=======================================================\n");

  Serial.println("[BT] Starting Bluetooth A2DP Source scan...");

  // Register callbacks
  a2dp_source.set_on_connection_state_changed(connection_state_changed);
  a2dp_source.set_data_callback_in_frames(get_sound_data);
  a2dp_source.set_ssid_callback(scan_device_callback);
  a2dp_source.set_auto_reconnect(false); // Scan fresh every time
  a2dp_source.start();
}

void loop() {
  static unsigned long lastHeartbeat = 0;

  if (millis() - lastHeartbeat > 3000) {
    lastHeartbeat = millis();

    if (a2dp_source.is_connected()) {
      Serial.println("[STATUS] >>> Speaker is CONNECTED and STREAMING AUDIO <<<");
    } else {
      // Blink LED while scanning
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      Serial.println("[STATUS] Scanning for Bluetooth speaker in the air...");
    }
  }

  delay(10);
}
