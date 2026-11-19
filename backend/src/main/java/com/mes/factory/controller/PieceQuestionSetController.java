package com.mes.factory.controller;

import com.mes.factory.dto.request.CreatePieceQuestionSetRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.PieceQuestionSet;
import com.mes.factory.entity.postgres.PieceType;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.PieceQuestionSetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/piece-question-sets")
public class PieceQuestionSetController {

    private final PieceQuestionSetService service;

    public PieceQuestionSetController(PieceQuestionSetService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<List<PieceQuestionSet>>> getAll(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) PieceType pieceType) {
        List<PieceQuestionSet> sets = service.getAllByFactory(user.getFactoryId(), pieceType);
        return ResponseEntity.ok(ApiResponse.success(sets, "Piece question sets retrieved"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<PieceQuestionSet>> getById(@PathVariable UUID id) {
        PieceQuestionSet set = service.getById(id);
        return ResponseEntity.ok(ApiResponse.success(set, "Piece question set retrieved"));
    }

    @GetMapping("/by-operation/{operationMasterId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PieceQuestionSet>> getByOperation(
            @PathVariable UUID operationMasterId,
            @RequestParam(required = false, defaultValue = "FIRST_PIECE") PieceType pieceType,
            @RequestParam(required = false) UUID gaugeMasterId) {
        return service.getForOperationAndGauge(operationMasterId, pieceType, gaugeMasterId)
                .map(set -> ResponseEntity.ok(ApiResponse.success(set, "Piece question set found")))
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "No piece question set for this operation")));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<PieceQuestionSet>> create(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreatePieceQuestionSetRequest request) {
        PieceQuestionSet set = service.create(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(set, "Piece question set created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<PieceQuestionSet>> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreatePieceQuestionSetRequest request) {
        PieceQuestionSet set = service.update(id, user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(set, "Piece question set updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Piece question set deleted"));
    }
}

