package com.mes.factory.controller;

import com.mes.factory.dto.request.CreateLpaQuestionSetRequest;
import com.mes.factory.dto.request.CreateLpaScheduleRequest;
import com.mes.factory.dto.request.SubmitLpaAuditRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.dto.response.LpaDashboardSummary;
import com.mes.factory.dto.request.UpdateNcActionRequest;
import com.mes.factory.dto.response.LpaNcResponse;
import com.mes.factory.entity.postgres.LpaAuditLog;
import com.mes.factory.entity.postgres.LpaAuditType;
import com.mes.factory.entity.postgres.LpaQuestionSet;
import com.mes.factory.entity.postgres.LpaSchedule;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.LpaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lpa")
public class LpaController {

    private final LpaService lpaService;

    public LpaController(LpaService lpaService) {
        this.lpaService = lpaService;
    }

    @PostMapping("/question-sets")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<LpaQuestionSet>> createQuestionSet(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateLpaQuestionSetRequest request) {
        LpaQuestionSet qs = lpaService.createQuestionSet(user.getFactoryId(), user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(qs, "Checklist created successfully"));
    }

    @PutMapping("/question-sets/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<LpaQuestionSet>> updateQuestionSet(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID id,
            @Valid @RequestBody CreateLpaQuestionSetRequest request) {
        LpaQuestionSet qs = lpaService.updateQuestionSet(user.getFactoryId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(qs, "Checklist updated successfully"));
    }

    @PostMapping(value = "/question-sets/import-excel", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<List<LpaQuestionSet>>> importExcel(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("auditType") String auditType) {
        List<LpaQuestionSet> sets = lpaService.importFromExcel(user.getFactoryId(), user.getUserId(), file, auditType);
        return ResponseEntity.ok(ApiResponse.success(sets, "Checklists imported successfully from Excel"));
    }

    @PostMapping(value = "/question-sets/preview-excel", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<List<CreateLpaQuestionSetRequest>>> previewExcel(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("auditType") String auditType) {
        List<CreateLpaQuestionSetRequest> sets = lpaService.previewFromExcel(file, auditType);
        return ResponseEntity.ok(ApiResponse.success(sets, "Checklists preview parsed successfully"));
    }

    @GetMapping("/question-sets")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LpaQuestionSet>>> getQuestionSets(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) LpaAuditType auditType) {
        List<LpaQuestionSet> list = lpaService.getQuestionSets(user.getFactoryId(), auditType);
        return ResponseEntity.ok(ApiResponse.success(list, "Checklists retrieved"));
    }

    @PostMapping("/schedules")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<LpaSchedule>> createSchedule(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateLpaScheduleRequest request) {
        LpaSchedule schedule = lpaService.createSchedule(user.getFactoryId(), request);
        return ResponseEntity.ok(ApiResponse.success(schedule, "Audit scheduled successfully"));
    }

    @GetMapping("/schedules")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LpaSchedule>>> getSchedules(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) LpaAuditType auditType) {
        List<LpaSchedule> list = lpaService.getSchedules(user.getFactoryId(), auditType);
        return ResponseEntity.ok(ApiResponse.success(list, "Schedules retrieved"));
    }

    @PostMapping("/audits")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<LpaAuditLog>> submitAudit(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody SubmitLpaAuditRequest request) {
        LpaAuditLog logEntity = lpaService.submitAudit(user.getFactoryId(), user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(logEntity, "Audit submitted successfully"));
    }

    @GetMapping("/audits")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LpaAuditLog>>> getAuditLogs(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) LpaAuditType auditType) {
        List<LpaAuditLog> list = lpaService.getAuditLogs(user.getFactoryId(), auditType);
        return ResponseEntity.ok(ApiResponse.success(list, "Audit logs retrieved"));
    }

    @GetMapping("/dashboard/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LpaDashboardSummary>> getDashboardSummary(
            @AuthenticationPrincipal CustomUserDetails user) {
        LpaDashboardSummary summary = lpaService.getDashboardSummary(user.getFactoryId());
        return ResponseEntity.ok(ApiResponse.success(summary, "Dashboard summary retrieved"));
    }

    @GetMapping("/ncs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LpaNcResponse>>> getNonConformances(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<LpaNcResponse> ncs = lpaService.getNonConformances(user.getFactoryId());
        return ResponseEntity.ok(ApiResponse.success(ncs, "NCs retrieved successfully"));
    }

    @PutMapping("/ncs/{answerId}/action")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<LpaNcResponse>> updateNcAction(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID answerId,
            @RequestBody UpdateNcActionRequest request) {
        LpaNcResponse response = lpaService.updateNcAction(user.getFactoryId(), answerId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "NC action updated successfully"));
    }
}
