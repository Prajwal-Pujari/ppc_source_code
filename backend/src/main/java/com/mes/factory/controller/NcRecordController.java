package com.mes.factory.controller;

import com.mes.factory.dto.request.NcRecordRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.NcRecord;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.NcRecordService;
import com.mes.factory.repository.postgres.NcRecordRepository;
import jakarta.validation.Valid;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/nc-records")
public class NcRecordController {

    private final NcRecordService ncRecordService;
    private final NcRecordRepository ncRecordRepository;

    public NcRecordController(NcRecordService ncRecordService, NcRecordRepository ncRecordRepository) {
        this.ncRecordService = ncRecordService;
        this.ncRecordRepository = ncRecordRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<List<NcRecord>>> getAllNcRecords() {
        List<NcRecord> records = ncRecordRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success(records));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<NcRecord>> createNcRecord(
            @Valid @RequestBody NcRecordRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        NcRecord record = ncRecordService.createNcRecord(request, user.getUserId());
        return ResponseEntity.ok(ApiResponse.success(record, "NC record created"));
    }

    @GetMapping("/gauge/{gaugeId}")
    public ResponseEntity<ApiResponse<List<NcRecord>>> getGaugeNcRecords(@PathVariable UUID gaugeId) {
        return ResponseEntity.ok(ApiResponse.success(ncRecordService.getGaugeNcRecords(gaugeId)));
    }
}
