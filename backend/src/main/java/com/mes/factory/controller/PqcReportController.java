package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.dto.response.QualityReportDto;
import com.mes.factory.service.PqcReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pqc/reports")
@RequiredArgsConstructor
public class PqcReportController {

    private final PqcReportService pqcReportService;

    @GetMapping("/gauge/{gaugeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<QualityReportDto>> getReportByGauge(
            @PathVariable UUID gaugeId,
            @RequestParam(defaultValue = "IN_PROCESS") String reportType,
            @RequestParam(required = false) UUID shiftId,
            @RequestParam(required = false) UUID operationId,
            @RequestParam(required = false) String filterDate) {
        
        QualityReportDto report = pqcReportService.generateReport(gaugeId, reportType, shiftId, operationId, filterDate);
        return ResponseEntity.ok(ApiResponse.success(report, "Report generated successfully"));
    }
}
