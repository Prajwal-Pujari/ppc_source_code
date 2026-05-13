package com.mes.factory.controller;

import com.mes.factory.dto.request.CreateQuestionSetRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.PqcQuestionSet;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.PqcQuestionSetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pqc/question-sets")
public class PqcQuestionSetController {

    private final PqcQuestionSetService questionSetService;

    public PqcQuestionSetController(PqcQuestionSetService questionSetService) {
        this.questionSetService = questionSetService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<List<PqcQuestionSet>>> getAll(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<PqcQuestionSet> sets = questionSetService.getAllByFactory(user.getFactoryId());
        return ResponseEntity.ok(ApiResponse.success(sets, "Question sets retrieved"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<PqcQuestionSet>> getById(@PathVariable UUID id) {
        PqcQuestionSet set = questionSetService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(set, "Question set retrieved"));
    }

    @GetMapping("/by-operation/{operationMasterId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PqcQuestionSet>> getByOperation(
            @PathVariable UUID operationMasterId,
            @RequestParam(required = false) UUID gaugeMasterId) {
        return questionSetService.getForOperationAndGauge(operationMasterId, gaugeMasterId)
                .map(set -> ResponseEntity.ok(ApiResponse.success(set, "Question set found")))
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "No question set for this operation")));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<PqcQuestionSet>> create(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateQuestionSetRequest request) {
        PqcQuestionSet set = questionSetService.create(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(set, "Question set created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<PqcQuestionSet>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuestionSetRequest request) {
        PqcQuestionSet set = questionSetService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(set, "Question set updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        questionSetService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Question set deactivated"));
    }
}
