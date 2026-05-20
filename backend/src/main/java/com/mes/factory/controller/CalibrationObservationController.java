package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.CalibrationObservation;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.CalibrationObservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calibration")
@PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
public class CalibrationObservationController {

    private final CalibrationObservationService service;

    public CalibrationObservationController(CalibrationObservationService service) {
        this.service = service;
    }

    @GetMapping("/{gaugeOperationId}/observations")
    public ResponseEntity<ApiResponse<List<CalibrationObservation>>> getObservations(
            @PathVariable UUID gaugeOperationId) {
        return ResponseEntity.ok(ApiResponse.success(service.getObservations(gaugeOperationId)));
    }

    @PostMapping("/{gaugeOperationId}/observations/init")
    public ResponseEntity<ApiResponse<List<CalibrationObservation>>> initObservations(
            @PathVariable UUID gaugeOperationId) {
        return ResponseEntity.ok(ApiResponse.success(service.initializeObservations(gaugeOperationId)));
    }

    @PostMapping("/{gaugeOperationId}/observations")
    public ResponseEntity<ApiResponse<List<CalibrationObservation>>> saveObservations(
            @PathVariable UUID gaugeOperationId,
            @RequestBody List<Map<String, Object>> observationData,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(service.saveObservations(gaugeOperationId, observationData, user.getUserId())));
    }

    @GetMapping("/gauge/{gaugeId}/observations")
    public ResponseEntity<ApiResponse<List<CalibrationObservation>>> getObservationsByGauge(
            @PathVariable UUID gaugeId) {
        return ResponseEntity.ok(ApiResponse.success(service.getObservationsByGauge(gaugeId)));
    }
}
