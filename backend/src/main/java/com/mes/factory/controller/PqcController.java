package com.mes.factory.controller;

import com.mes.factory.dto.request.PqcInspectionLogRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.PqcInspectionLog;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.PqcInspectionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pqc")
public class PqcController {

    private final PqcInspectionService pqcInspectionService;

    public PqcController(PqcInspectionService pqcInspectionService) {
        this.pqcInspectionService = pqcInspectionService;
    }

    @PostMapping("/inspections")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<PqcInspectionLog>> logInspection(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PqcInspectionLogRequest request) {
        
        PqcInspectionLog log = pqcInspectionService.logInspection(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(log, "Inspection logged successfully"));
    }

    @GetMapping("/inspections/progress/{operationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCompletionProgress(
            @PathVariable UUID operationId) {
        Map<String, Object> progress = pqcInspectionService.getCompletionProgress(operationId);
        return ResponseEntity.ok(ApiResponse.success(progress, "Progress retrieved"));
    }
}
