package com.mes.factory.controller;

import com.mes.factory.dto.request.CreateMachineSetupConfig;
import com.mes.factory.dto.request.MachineSetupLogRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.dto.response.SetupReportDto;
import com.mes.factory.entity.postgres.MachineSetupLog;
import com.mes.factory.entity.postgres.MachineSetupQuestionSet;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.MachineSetupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/machine-setup")
@RequiredArgsConstructor
public class MachineSetupController {

    private final MachineSetupService machineSetupService;

    @GetMapping("/config/{machineId}/{operationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<MachineSetupQuestionSet>> getConfig(
            @PathVariable UUID machineId,
            @PathVariable UUID operationId,
            @RequestParam(required = false) UUID gaugeMasterId) {
        Optional<MachineSetupQuestionSet> config = machineSetupService.getForMachine(machineId, operationId, gaugeMasterId);
        return config.map(c -> ResponseEntity.ok(ApiResponse.success(c)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.success(null, "No setup config found")));
    }

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<java.util.List<MachineSetupQuestionSet>>> getAllConfigs() {
        return ResponseEntity.ok(ApiResponse.success(machineSetupService.getAllQuestionSets()));
    }

    @PostMapping("/config")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<MachineSetupQuestionSet>> createConfig(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateMachineSetupConfig request) {
        MachineSetupQuestionSet saved = machineSetupService.createQuestionSet(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(saved, "Setup config created"));
    }

    @PostMapping(value = "/bulk-upload/{machineId}", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkUpload(
            @PathVariable UUID machineId,
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam("file") MultipartFile file) {
        Map<String, Object> result = machineSetupService.importFromExcel(machineId, user.getUserId(), file);
        return ResponseEntity.ok(ApiResponse.success(result, "Bulk upload successful"));
    }

    @PostMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
    public ResponseEntity<ApiResponse<MachineSetupLog>> submitSetupLog(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody MachineSetupLogRequest request) {
        MachineSetupLog log = machineSetupService.submitSetupLog(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(log, "Setup logged successfully"));
    }

    @PutMapping("/config/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<MachineSetupQuestionSet>> updateConfig(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID id,
            @Valid @RequestBody CreateMachineSetupConfig request) {
        MachineSetupQuestionSet updated = machineSetupService.updateQuestionSet(user.getUserId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Setup config updated"));
    }

    @DeleteMapping("/config/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<Void>> deleteConfig(@PathVariable UUID id) {
        machineSetupService.deleteQuestionSet(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Setup config deleted"));
    }

    @GetMapping("/report/gauge/{gaugeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<SetupReportDto>> getSetupReport(@PathVariable UUID gaugeId) {
        SetupReportDto report = machineSetupService.generateSetupReport(gaugeId);
        return ResponseEntity.ok(ApiResponse.success(report, "Setup report generated successfully"));
    }
}
