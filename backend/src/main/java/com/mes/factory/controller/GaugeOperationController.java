package com.mes.factory.controller;

import com.mes.factory.dto.request.AssignOperationRequest;
import com.mes.factory.dto.request.CompleteOperationRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.GaugeOperationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gauge-operations")
public class GaugeOperationController {

    private final GaugeOperationService gaugeOperationService;

    public GaugeOperationController(GaugeOperationService gaugeOperationService) {
        this.gaugeOperationService = gaugeOperationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<List<GaugeOperation>>> getOperations(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false, defaultValue = "PENDING,QUEUED,IN_PROGRESS") String statuses) {
        List<GaugeOperation> ops = gaugeOperationService.getFactoryOperationsByStatus(
                user.getFactoryId(), statuses);
        return ResponseEntity.ok(ApiResponse.success(ops));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<GaugeOperation>> assignOperation(
            @PathVariable UUID id,
            @Valid @RequestBody AssignOperationRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        GaugeOperation op = gaugeOperationService.assignOperation(id, request.getWorkerId(), request.getMachineId(), user.getUserId());
        return ResponseEntity.ok(ApiResponse.success(op, "Operation assigned"));
    }

    @PutMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
    public ResponseEntity<ApiResponse<GaugeOperation>> startOperation(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails user) {
        GaugeOperation op = gaugeOperationService.startOperation(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.success(op, "Operation started"));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
    public ResponseEntity<ApiResponse<GaugeOperation>> completeOperation(
            @PathVariable UUID id,
            @RequestBody CompleteOperationRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        GaugeOperation op = gaugeOperationService.completeOperation(
                id, user.getUserId(), request.getRemarks(), request.getQualityParams());
        return ResponseEntity.ok(ApiResponse.success(op, "Operation completed"));
    }

    @PutMapping("/{id}/flag-issue")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
    public ResponseEntity<ApiResponse<Void>> flagIssue(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails user) {
        gaugeOperationService.flagIssue(id, user.getUserId(), body.get("issueDescription"));
        return ResponseEntity.ok(ApiResponse.success(null, "Issue flagged"));
    }
}
