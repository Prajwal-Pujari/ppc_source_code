package com.mes.factory.controller;

import com.mes.factory.dto.request.PqcInspectionLogRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.PqcInspectionLog;
import com.mes.factory.repository.postgres.PqcInspectionLogRepository;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.PqcInspectionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@RestController
@RequestMapping("/api/v1/pqc")
public class PqcController {

    private final PqcInspectionService pqcInspectionService;
    private final PqcInspectionLogRepository inspectionLogRepository;

    public PqcController(PqcInspectionService pqcInspectionService,
                         PqcInspectionLogRepository inspectionLogRepository) {
        this.pqcInspectionService = pqcInspectionService;
        this.inspectionLogRepository = inspectionLogRepository;
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

    /**
     * PQC Dashboard — returns all stats in a single call.
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "today") String period) {

        UUID factoryId = user.getFactoryId();
        OffsetDateTime since;

        switch (period) {
            case "week":
                since = LocalDate.now().minusDays(7).atStartOfDay().atOffset(ZoneOffset.UTC);
                break;
            case "month":
                since = LocalDate.now().minusDays(30).atStartOfDay().atOffset(ZoneOffset.UTC);
                break;
            default: // "today"
                since = LocalDate.now().atStartOfDay().atOffset(ZoneOffset.UTC);
                break;
        }

        // ── Summary stats ──
        long planned = inspectionLogRepository.sumPlannedSince(factoryId, since);
        long produced = inspectionLogRepository.sumActualSince(factoryId, since);
        long passed = inspectionLogRepository.sumPassedSince(factoryId, since);
        long rejected = inspectionLogRepository.sumRejectedSince(factoryId, since);
        long rework = inspectionLogRepository.sumReworkSince(factoryId, since);
        long scrap = inspectionLogRepository.sumScrapSince(factoryId, since);
        long batchCount = inspectionLogRepository.countLogsSince(factoryId, since);

        // All-time for yield comparison
        long allTimeProduced = inspectionLogRepository.sumActualAllTime(factoryId);
        long allTimePassed = inspectionLogRepository.sumPassedAllTime(factoryId);
        double allTimeYield = allTimeProduced > 0 ? (double) allTimePassed / allTimeProduced * 100 : 0;
        double periodYield = produced > 0 ? (double) passed / produced * 100 : 0;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("planned", planned);
        summary.put("produced", produced);
        summary.put("passed", passed);
        summary.put("rejected", rejected);
        summary.put("rework", rework);
        summary.put("scrap", scrap);
        summary.put("batchCount", batchCount);
        summary.put("yieldRate", Math.round(periodYield * 10.0) / 10.0);
        summary.put("allTimeYield", Math.round(allTimeYield * 10.0) / 10.0);

        // ── Hourly breakdown (for bar chart) ──
        List<PqcInspectionLog> logs = inspectionLogRepository.findAllSince(factoryId, since);
        Map<Integer, Map<String, Long>> hourlyMap = new TreeMap<>();

        for (PqcInspectionLog l : logs) {
            int hour = l.getLogTime().getHour();
            Map<String, Long> bucket = hourlyMap.computeIfAbsent(hour, h -> {
                Map<String, Long> m = new LinkedHashMap<>();
                m.put("hour", (long) h);
                m.put("produced", 0L);
                m.put("passed", 0L);
                m.put("rejected", 0L);
                return m;
            });
            bucket.put("produced", bucket.get("produced") + l.getActualQty());
            bucket.put("passed", bucket.get("passed") + l.getPassedQty());
            bucket.put("rejected", bucket.get("rejected") + l.getRejectedQty());
        }
        List<Map<String, Long>> hourly = new ArrayList<>(hourlyMap.values());

        // ── Rejection reasons breakdown (for pie chart) ──
        Map<String, Long> reasonCounts = new LinkedHashMap<>();
        for (PqcInspectionLog l : logs) {
            if (l.getRejectionReasons() != null) {
                for (Map<String, Object> r : l.getRejectionReasons()) {
                    String reason = String.valueOf(r.getOrDefault("reason", "Unknown"));
                    long count = 1;
                    Object countObj = r.getOrDefault("count", r.getOrDefault("qty", 1));
                    if (countObj instanceof Number) {
                        count = ((Number) countObj).longValue();
                    }
                    reasonCounts.merge(reason, count, Long::sum);
                }
            }
        }
        List<Map<String, Object>> rejectionBreakdown = new ArrayList<>();
        reasonCounts.forEach((reason, count) ->
                rejectionBreakdown.add(Map.of("reason", reason, "count", count)));

        // ── Recent inspections (last 10) ──
        List<PqcInspectionLog> recentLogs = inspectionLogRepository.findRecentByFactory(
                factoryId, PageRequest.of(0, 10));
        List<Map<String, Object>> recent = new ArrayList<>();
        for (PqcInspectionLog l : recentLogs) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", l.getId().toString());
            entry.put("logTime", l.getLogTime().toString());
            entry.put("inspectorName", l.getInspector() != null ? l.getInspector().getFullName() : "—");
            entry.put("operationName", l.getGaugeOperation() != null ? l.getGaugeOperation().getOperationName() : "—");
            entry.put("gaugeSN", l.getGauge() != null ? l.getGauge().getSerialNumber() : "—");
            entry.put("gaugeType", l.getGauge() != null ? l.getGauge().getGaugeTypeName() : "—");
            entry.put("actualQty", l.getActualQty());
            entry.put("passedQty", l.getPassedQty());
            entry.put("rejectedQty", l.getRejectedQty());
            entry.put("reworkQty", l.getReworkQty());
            entry.put("scrapQty", l.getScrapQty());
            entry.put("remarks", l.getRemarks());
            recent.add(entry);
        }

        // ── Build final response ──
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summary);
        result.put("hourly", hourly);
        result.put("rejectionBreakdown", rejectionBreakdown);
        result.put("recentInspections", recent);
        result.put("period", period);

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}

