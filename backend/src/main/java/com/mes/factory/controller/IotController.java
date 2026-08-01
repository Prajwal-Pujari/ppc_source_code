package com.mes.factory.controller;

import com.mes.factory.dto.request.IotTriggerRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.service.IotService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/iot")
public class IotController {

    private final IotService iotService;

    public IotController(IotService iotService) {
        this.iotService = iotService;
    }

    @PostMapping("/trigger")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<Void>> triggerIotDevice(@Valid @RequestBody IotTriggerRequest request) {
        iotService.triggerDevice(request.getIpAddress(), request.getSound());
        return ResponseEntity.ok(ApiResponse.success(null, "Successfully triggered IoT device at " + request.getIpAddress()));
    }

    @PostMapping("/speak")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<Void>> speakToIotDevice(@Valid @RequestBody com.mes.factory.dto.request.IotSpeakRequest request) {
        iotService.speakToDevice(request.getIpAddress(), request.getText());
        return ResponseEntity.ok(ApiResponse.success(null, "Successfully sent voice message to " + request.getIpAddress()));
    }
}
