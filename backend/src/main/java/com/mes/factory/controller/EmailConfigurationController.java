package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.dto.EmailConfigurationDto;
import com.mes.factory.service.EmailConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings/email")
@RequiredArgsConstructor
public class EmailConfigurationController {

    private final EmailConfigurationService emailConfigurationService;

    @GetMapping("/{factoryId}")
    public ResponseEntity<ApiResponse<EmailConfigurationDto>> getConfiguration(@PathVariable UUID factoryId) {
        EmailConfigurationDto config = emailConfigurationService.getConfiguration(factoryId);
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    @PutMapping("/{factoryId}")
    public ResponseEntity<ApiResponse<EmailConfigurationDto>> saveConfiguration(
            @PathVariable UUID factoryId,
            @RequestBody EmailConfigurationDto dto) {
        EmailConfigurationDto saved = emailConfigurationService.saveConfiguration(factoryId, dto);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PostMapping("/{factoryId}/test")
    public ResponseEntity<ApiResponse<String>> testConnection(
            @PathVariable UUID factoryId,
            @RequestBody Map<String, String> payload) {
        
        String testEmail = payload.get("testEmailAddress");
        try {
            emailConfigurationService.testConnection(factoryId, testEmail);
            return ResponseEntity.ok(ApiResponse.success("Connection successful! Test email sent if address provided."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Connection failed: " + e.getMessage(), "SMTP_CONNECTION_ERROR"));
        }
    }
}
