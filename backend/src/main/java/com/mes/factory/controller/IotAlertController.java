package com.mes.factory.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Map;

@RestController
@RequestMapping("/api/iot")
@CrossOrigin(origins = "*")
public class IotAlertController {

    /**
     * Simulates an IoT Voice Alert by playing TTS (Text-to-Speech) natively on the 
     * server machine (Windows) where the Spring Boot backend is running.
     * This allows the laptop's connected Bluetooth speaker to directly announce the message.
     */
    @PostMapping("/alert")
    @PreAuthorize("permitAll()") // Allows the remote to trigger this during the presentation
    public ResponseEntity<String> triggerVoiceAlert(@RequestBody Map<String, String> payload) {
        String message = payload.getOrDefault("message", "Critical process deviation detected.");
        
        try {
            // Escape single quotes for PowerShell
            String safeMessage = message.replace("'", "''");
            
            // Construct a PowerShell command to use the built-in Windows Speech Synthesizer
            String script = "Add-Type -AssemblyName System.Speech; " +
                            "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
                            "$synth.Volume = 100; " +
                            "$synth.Speak('" + safeMessage + "')";
            
            ProcessBuilder pb = new ProcessBuilder("powershell.exe", "-Command", script);
            pb.start(); // Run async so the HTTP request returns immediately
            
            return ResponseEntity.ok("{\"status\":\"success\", \"message\":\"Alert broadcasted to IoT speaker.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"status\":\"error\", \"message\":\"Failed to play alert.\"}");
        }
    }
}
