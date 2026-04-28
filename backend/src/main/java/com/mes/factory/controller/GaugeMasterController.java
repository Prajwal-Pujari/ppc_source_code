package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.dto.response.GaugeMasterOperationResponse;
import com.mes.factory.dto.response.GaugeMasterResponse;
import com.mes.factory.entity.postgres.GaugeMaster;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.GaugeMasterService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gauge-masters")
public class GaugeMasterController {

    private final GaugeMasterService gaugeMasterService;

    public GaugeMasterController(GaugeMasterService gaugeMasterService) {
        this.gaugeMasterService = gaugeMasterService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<GaugeMasterResponse>>> getGaugeMasters(
            @AuthenticationPrincipal CustomUserDetails user,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                gaugeMasterService.getGaugeMasters(user.getFactoryId(), pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GaugeMasterResponse>> getGaugeMaster(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(gaugeMasterService.getGaugeMaster(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GaugeMasterResponse>> createGaugeMaster(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody GaugeMaster gaugeMaster) {
        return ResponseEntity.ok(ApiResponse.success(
                gaugeMasterService.createGaugeMaster(user.getFactoryId(), gaugeMaster), "Gauge master created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GaugeMasterResponse>> updateGaugeMaster(
            @PathVariable UUID id,
            @RequestBody GaugeMaster gaugeMaster) {
        return ResponseEntity.ok(ApiResponse.success(
                gaugeMasterService.updateGaugeMaster(id, gaugeMaster), "Gauge master updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteGaugeMaster(@PathVariable UUID id) {
        gaugeMasterService.deleteGaugeMaster(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Gauge master deleted"));
    }

    @GetMapping("/{id}/operations")
    public ResponseEntity<ApiResponse<List<GaugeMasterOperationResponse>>> getOperationSequence(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                gaugeMasterService.getDefaultOperationSequence(id)));
    }

    @PostMapping("/{id}/operations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GaugeMasterOperationResponse>> addOperation(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        UUID operationMasterId = UUID.fromString((String) body.get("operationMasterId"));
        Integer sequenceOrder = (Integer) body.get("sequenceOrder");
        return ResponseEntity.ok(ApiResponse.success(
                gaugeMasterService.addOperation(id, operationMasterId, sequenceOrder), "Operation added to sequence"));
    }

    @DeleteMapping("/{gmId}/operations/{opId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeOperation(
            @PathVariable UUID gmId, @PathVariable UUID opId) {
        gaugeMasterService.removeOperation(gmId, opId);
        return ResponseEntity.ok(ApiResponse.success(null, "Operation removed from sequence"));
    }

    @PutMapping("/{id}/operations/reorder")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> reorderOperations(
            @PathVariable UUID id,
            @RequestBody List<UUID> orderedOperationMasterIds) {
        gaugeMasterService.reorderOperations(id, orderedOperationMasterIds);
        return ResponseEntity.ok(ApiResponse.success(null, "Operations reordered"));
    }
}