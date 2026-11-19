/*
 * =====================================================================================
 *  MES Factory - ESP32 Wired Speaker Hardware Test (No WiFi Required)
 * =====================================================================================
 *  Use this sketch to test your wired amplifier + speaker connection immediately!
 *  It plays a continuous pulsing beep through D25, D26, and D27.
 *  You can wiggle each wire while this is running to check for loose connections.
 * 
 *  Wiring:
 *    - GND         -> GND
 *    - VIN         -> VIN / 5V (USB power)
 *    - LRC / WS    -> GPIO D25
 *    - BCLK / CLK  -> GPIO D26
 *    - DIN / DATA  -> GPIO D27
 *    - Speaker     -> Screw terminals (+ and -) of Mono Amplifier
 * =====================================================================================
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

#define I2S_LRC_PIN     25   // LRC / WS
#define I2S_BCK_PIN     26   // BCLK / CLK
#define I2S_DATA_OUT    27   // DIN / DATA
#define LED_PIN         2    // Built-in LED

#define I2S_NUM         I2S_NUM_0
#define SAMPLE_RATE     44100

void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 512,
    .use_apll = false,
    .tx_desc_auto_clear = true
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCK_PIN,
    .ws_io_num = I2S_LRC_PIN,
    .data_out_num = I2S_DATA_OUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_NUM, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM, &pin_config);
  i2s_set_clk(I2S_NUM, SAMPLE_RATE, I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_STEREO);
}

void playBeep(float frequency, int durationMs) {
  int totalSamples = (SAMPLE_RATE * durationMs) / 1000;
  const int bufSize = 128;
  int16_t buf[bufSize * 2];
  size_t bytesWritten;

  float phase = 0.0;
  float phaseIncrement = (2.0 * PI * frequency) / SAMPLE_RATE;

  int samplesRemaining = totalSamples;
  while (samplesRemaining > 0) {
    int chunk = samplesRemaining > bufSize ? bufSize : samplesRemaining;
    for (int i = 0; i < chunk; i++) {
      int16_t sample = (int16_t)(sin(phase) * 16000.0);
      buf[i * 2]     = sample; // Left
      buf[i * 2 + 1] = sample; // Right
      phase += phaseIncrement;
      if (phase >= 2.0 * PI) phase -= 2.0 * PI;
    }
    i2s_write(I2S_NUM, buf, chunk * sizeof(int16_t) * 2, &bytesWritten, portMAX_DELAY);
    samplesRemaining -= chunk;
  }

  i2s_zero_dma_buffer(I2S_NUM);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  delay(1000);

  Serial.println("\n==============================================");
  Serial.println("  ESP32 Wired Speaker Live Hardware Test       ");
  Serial.println("  Pins: LRC=D25, BCLK=D26, DIN=D27            ");
  Serial.println("==============================================");
  Serial.println("If wired correctly, you will hear repeating beeps!");
  Serial.println("Wiggle the D25, D26, D27, GND, and VIN wires to check for loose contact.\n");

  initI2S();
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println(">>> Playing HIGH Beep (1000 Hz) <<<");
  playBeep(1000.0, 300);

  delay(100);

  digitalWrite(LED_PIN, LOW);
  Serial.println(">>> Playing LOW Beep (600 Hz) <<<");
  playBeep(600.0, 300);

  digitalWrite(LED_PIN, LOW);
  delay(1000); // 1 second silence between beeps
}
