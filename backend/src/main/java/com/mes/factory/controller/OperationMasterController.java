package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.OperationMaster;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.OperationMasterService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/operation-masters")
public class OperationMasterController {

    private final OperationMasterService operationMasterService;

    public OperationMasterController(OperationMasterService operationMasterService) {
        this.operationMasterService = operationMasterService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OperationMaster>>> getOperations(
            @AuthenticationPrincipal CustomUserDetails user,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                operationMasterService.getOperations(user.getFactoryId(), pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OperationMaster>> getOperation(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(operationMasterService.getOperation(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OperationMaster>> createOperation(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody OperationMaster operation) {
        OperationMaster created = operationMasterService.createOperation(user.getFactoryId(), operation);
        return ResponseEntity.ok(ApiResponse.success(created, "Operation created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OperationMaster>> updateOperation(
            @PathVariable UUID id,
            @RequestBody OperationMaster operation) {
        OperationMaster updated = operationMasterService.updateOperation(id, operation);
        return ResponseEntity.ok(ApiResponse.success(updated, "Operation updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteOperation(@PathVariable UUID id) {
        operationMasterService.deleteOperation(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Operation deleted"));
    }
}
