package com.mes.factory.service;

import com.mes.factory.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class IotService {

    private static final Logger log = LoggerFactory.getLogger(IotService.class);
    private final RestTemplate restTemplate;

    public IotService() {
        this.restTemplate = new RestTemplate();
    }

    public void triggerDevice(String ipAddress, String sound) {
        String url = "http://" + ipAddress + "/trigger" + (sound != null && !sound.isEmpty() ? "?sound=" + sound : "");
        try {
            log.info("Triggering IoT device at {}", url);
            String response = restTemplate.getForObject(url, String.class);
            log.info("IoT device response: {}", response);
        } catch (Exception e) {
            log.error("Failed to trigger IoT device at {}: {}", url, e.getMessage());
            throw new BusinessException("Could not connect to IoT device at " + ipAddress + ". Ensure it is powered on and connected to the same network.", "IOT_CONNECTION_FAILED");
        }
    }

    public void speakToDevice(String ipAddress, String text) {
        try {
            // 1. Download MP3 from Google TTS
            String encodedText = java.net.URLEncoder.encode(text, java.nio.charset.StandardCharsets.UTF_8.toString());
            String ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + encodedText + "&tl=en&client=tw-ob";
            
            byte[] mp3Bytes = restTemplate.getForObject(ttsUrl, byte[].class);
            if (mp3Bytes == null || mp3Bytes.length == 0) {
                throw new BusinessException("Failed to download TTS audio", "TTS_FAILED");
            }
            
            java.io.File tempMp3 = java.nio.file.Files.createTempFile("tts_", ".mp3").toFile();
            java.nio.file.Files.write(tempMp3.toPath(), mp3Bytes);
            
            // 2. Convert to RAW PCM
            java.io.File tempRaw = java.nio.file.Files.createTempFile("tts_", ".raw").toFile();
            
            ws.schild.jave.encode.AudioAttributes audio = new ws.schild.jave.encode.AudioAttributes();
            audio.setCodec("pcm_s16le");
            audio.setBitRate(1411200); // 44100 * 16 * 2
            audio.setChannels(2);
            audio.setSamplingRate(44100);

            ws.schild.jave.encode.EncodingAttributes attrs = new ws.schild.jave.encode.EncodingAttributes();
            attrs.setOutputFormat("s16le");
            attrs.setAudioAttributes(audio);
            
            ws.schild.jave.Encoder encoder = new ws.schild.jave.Encoder();
            encoder.encode(new ws.schild.jave.MultimediaObject(tempMp3), tempRaw, attrs);
            
            // 3. Send RAW to ESP32 (Removed manual silence to save disk space, ESP32 handles it now)
            byte[] rawBytes = java.nio.file.Files.readAllBytes(tempRaw.toPath());
            
            String uploadUrl = "http://" + ipAddress + "/upload_tts";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
            
            org.springframework.http.HttpEntity<byte[]> requestEntity = new org.springframework.http.HttpEntity<>(rawBytes, headers);
            log.info("Uploading RAW audio to ESP32: {} ({} bytes)", uploadUrl, rawBytes.length);
            
            restTemplate.postForObject(uploadUrl, requestEntity, String.class);
            
            // Cleanup
            tempMp3.delete();
            tempRaw.delete();
            
        } catch (Exception e) {
            log.error("Failed to generate and upload voice message: {}", e.getMessage(), e);
            throw new BusinessException("Failed to generate and send voice message: " + e.getMessage(), "VOICE_FAILED");
        }
    }
}
