package com.mes.factory.controller;

import com.mes.factory.dto.request.PqcInspectionLogRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.PqcInspectionLog;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
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
    private final GaugeOperationRepository gaugeOperationRepository;

    public PqcController(PqcInspectionService pqcInspectionService,
                         PqcInspectionLogRepository inspectionLogRepository,
                         GaugeOperationRepository gaugeOperationRepository) {
        this.pqcInspectionService = pqcInspectionService;
        this.inspectionLogRepository = inspectionLogRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
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
            @PathVariable UUID operationId,
            @RequestParam(required = false) UUID shiftId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate shiftDate) {
        Map<String, Object> progress = pqcInspectionService.getCompletionProgress(operationId, shiftId, shiftDate);
        return ResponseEntity.ok(ApiResponse.success(progress, "Progress retrieved"));
    }

    @GetMapping("/scrap-report")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<List<PqcInspectionLog>>> getScrapReport(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<PqcInspectionLog> logs = inspectionLogRepository.findScrapLogsWithDetails(user.getFactoryId(), 0);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @PutMapping("/scrap-report/{id}/remarks")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<PqcInspectionLog>> updateScrapRemarks(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        PqcInspectionLog log = inspectionLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Log not found"));
        log.setReviewerRemarks(request.get("remarks"));
        inspectionLogRepository.save(log);
        return ResponseEntity.ok(ApiResponse.success(log, "Remarks updated successfully"));
    }

    @GetMapping("/incident-report")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR','WORKER')")
    public ResponseEntity<ApiResponse<List<PqcInspectionLog>>> getIncidentReport(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<PqcInspectionLog> logs = inspectionLogRepository.findIncidentLogsWithDetails(user.getFactoryId());
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @PutMapping("/incident-report/{id}/remarks")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<PqcInspectionLog>> updateIncidentRemarks(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        PqcInspectionLog log = inspectionLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Log not found"));
        log.setReviewerRemarks(request.get("remarks"));
        inspectionLogRepository.save(log);
        return ResponseEntity.ok(ApiResponse.success(log, "Remarks updated successfully"));
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
        java.time.ZoneId istZone = java.time.ZoneId.of("Asia/Kolkata");
        OffsetDateTime since;

        switch (period) {
            case "week":
                since = LocalDate.now(istZone).minusDays(7).atStartOfDay(istZone).toOffsetDateTime();
                break;
            case "month":
                since = LocalDate.now(istZone).minusDays(30).atStartOfDay(istZone).toOffsetDateTime();
                break;
            default: // "today"
                since = LocalDate.now(istZone).atStartOfDay(istZone).toOffsetDateTime();
                break;
        }
        // Fetch logs first to accurately calculate Final Operations metrics
        List<PqcInspectionLog> logs = inspectionLogRepository.findAllSince(factoryId, since);
        List<UUID> finalOpIds = gaugeOperationRepository.findFinalOperationIdsByFactory(factoryId);

        // ── Summary stats ──
        long planned = inspectionLogRepository.sumPlannedSince(factoryId, since);
        long produced = inspectionLogRepository.sumActualSince(factoryId, since);
        long rejected = inspectionLogRepository.sumRejectedSince(factoryId, since);
        long rework = inspectionLogRepository.sumReworkSince(factoryId, since);
        long scrap = inspectionLogRepository.sumScrapSince(factoryId, since);
        long batchCount = inspectionLogRepository.countLogsSince(factoryId, since);
        
        // Calculate Passed dynamically based ONLY on final operations (matches PO Tracker logic)
        long passed = 0;
        for (PqcInspectionLog l : logs) {
            if (l.getGaugeOperation() != null && finalOpIds.contains(l.getGaugeOperation().getId())) {
                passed += l.getPassedQty();
            }
        }

        // All-time for yield comparison
        long allTimeProduced = inspectionLogRepository.sumActualAllTime(factoryId);
        long allTimeRejected = inspectionLogRepository.sumRejectedAllTime(factoryId);
        long allTimePassed = allTimeProduced - allTimeRejected; // Simplified for all-time
        if (allTimePassed < 0) allTimePassed = 0;
        
        double allTimeYield = allTimeProduced > 0 ? (double) allTimePassed / allTimeProduced * 100 : 0;
        double periodYield = produced > 0 ? (double) passed / produced * 100 : 0;
        
        long ppm = (passed + rejected) > 0 ? (rejected * 1000000L) / (passed + rejected) : 0;

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
        summary.put("ppm", ppm);

        // ── Hourly breakdown (for bar chart) ──
        Map<String, Map<String, Object>> chartMap = new LinkedHashMap<>();

        for (PqcInspectionLog l : logs) {
            java.time.ZonedDateTime istTime = l.getLogTime().atZoneSameInstant(istZone);
            String groupKey;
            String label;

            if (period.equals("today")) {
                int hour = istTime.getHour();
                groupKey = String.valueOf(hour);
                label = String.format("%02d:00", hour);
            } else {
                java.time.LocalDate date = istTime.toLocalDate();
                groupKey = date.toString();
                label = istTime.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd"));
            }

            Map<String, Object> bucket = chartMap.computeIfAbsent(groupKey, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("label", label);
                m.put("produced", 0L);
                m.put("passed", 0L);
                m.put("rejected", 0L);
                m.put("rework", 0L);
                m.put("scrap", 0L);
                return m;
            });
            
            // Count all operations for the hourly inspection chart (matches summary cards)
            bucket.put("produced", (Long) bucket.get("produced") + l.getActualQty());
            bucket.put("passed", (Long) bucket.get("passed") + l.getPassedQty());
            bucket.put("rejected", (Long) bucket.get("rejected") + l.getRejectedQty());
            bucket.put("rework", (Long) bucket.get("rework") + (l.getReworkQty() != null ? l.getReworkQty() : 0L));
            bucket.put("scrap", (Long) bucket.get("scrap") + (l.getScrapQty() != null ? l.getScrapQty() : 0L));
        }
        List<Map<String, Object>> hourly = new ArrayList<>(chartMap.values());

        // ── Rejection reasons breakdown (for pie chart) ──
        Map<String, Long> reasonCounts = new LinkedHashMap<>();
        for (PqcInspectionLog l : logs) {
            boolean hasReasons = false;
            if (l.getRejectionReasons() != null && !l.getRejectionReasons().isEmpty()) {
                hasReasons = true;
                for (Map<String, Object> r : l.getRejectionReasons()) {
                    String reason = String.valueOf(r.getOrDefault("reason", "Unknown"));
                    long count = 1;
                    Object countObj = r.getOrDefault("count", r.getOrDefault("qty", 1));
                    if (countObj instanceof Number) {
                        count = ((Number) countObj).longValue();
                    } else if (countObj instanceof String) {
                        try { count = Long.parseLong((String) countObj); } catch (Exception ignored) {}
                    }
                    reasonCounts.put(reason, reasonCounts.getOrDefault(reason, 0L) + count);
                }
            }
            if (!hasReasons && l.getRejectedQty() != null && l.getRejectedQty() > 0) {
                reasonCounts.put("Unspecified Reason", reasonCounts.getOrDefault("Unspecified Reason", 0L) + l.getRejectedQty());
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

