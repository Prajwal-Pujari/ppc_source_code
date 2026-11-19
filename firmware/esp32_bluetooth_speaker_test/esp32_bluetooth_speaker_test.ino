/*
 * =====================================================================================
 *  MES Factory - ESP32 Bluetooth Audio Transmitter to "Mini boost 4"
 * =====================================================================================
 *  Connects ESP32 to your portable Bluetooth speaker "Mini boost 4" and plays
 *  test alert tones wirelessly!
 * 
 *  Prerequisites in Arduino IDE:
 *  1. Install Library:
 *     - Go to: Sketch -> Include Library -> Manage Libraries...
 *     - Search for: "ESP32-A2DP" by Phil Schatzmann
 *     - Click "Install"
 * 
 *  2. Change Partition Scheme (Crucial!):
 *     - Go to: Tools -> Partition Scheme -> Select "Huge APP (3MB No OTA / 1MB SPIFFS)"
 *     (Bluetooth stack requires extra flash memory).
 * 
 *  3. Turn on your "Mini boost 4" speaker and ensure it is in Bluetooth pairing mode.
 * =====================================================================================
 */

#include <Arduino.h>
#include "BluetoothA2DPSource.h"
#include <math.h>

#define LED_PIN         2
#define SAMPLE_RATE     44100

// Target Bluetooth Speaker Name
const char* BT_SPEAKER_NAME = "Mini boost 4";

BluetoothA2DPSource a2dp_source;

// Synthesizes a siren / alarm sound stream for the Bluetooth speaker
int32_t get_sound_data(Frame *data, int32_t len) {
  static float phase = 0.0;
  static float freq = 700.0;
  static float step = 1.0;

  // Sweep frequency between 600 Hz and 1300 Hz
  freq += step;
  if (freq >= 1300.0) step = -2.0;
  if (freq <= 600.0)  step = 2.0;

  float phaseInc = 2.0 * PI * freq / SAMPLE_RATE;

  for (int i = 0; i < len; i++) {
    phase += phaseInc;
    if (phase >= 2.0 * PI) phase -= 2.0 * PI;

    int16_t sample = (int16_t)(sin(phase) * 16000.0);
    data[i].channel1 = sample; // Left channel
    data[i].channel2 = sample; // Right channel
  }

  return len;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("  ESP32 Bluetooth Transmitter starting...             ");
  Serial.printf ("  Target Speaker: '%s'\n", BT_SPEAKER_NAME);
  Serial.println("=======================================================");
  Serial.println("Make sure your 'Mini boost 4' speaker is TURNED ON and");
  Serial.println("in PAIRING mode (disconnect it from phone if connected).\n");

  // Start Bluetooth transmitter and connect to speaker
  a2dp_source.set_auto_reconnect(true);
  a2dp_source.start(BT_SPEAKER_NAME, get_sound_data);

  Serial.println("[BT] Scanning for 'Mini boost 4'...");
}

void loop() {
  if (a2dp_source.is_connected()) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[BT] >>> CONNECTED to 'Mini boost 4' - Playing audio stream! <<<");
  } else {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink while scanning
    Serial.printf("[BT] Searching for '%s'...\n", BT_SPEAKER_NAME);
  }
  delay(2000);
}
