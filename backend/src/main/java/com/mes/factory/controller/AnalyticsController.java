package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.GaugeStatus;
import com.mes.factory.entity.mysql.DailyProductionSummary;
import com.mes.factory.entity.mysql.OperationPerformanceStats;
import com.mes.factory.entity.mysql.PoStatusSnapshot;
import com.mes.factory.entity.mysql.RejectionAnalysisSummary;
import com.mes.factory.entity.mysql.WorkerPerformanceMonthly;
import com.mes.factory.repository.mysql.DailyProductionSummaryRepository;
import com.mes.factory.repository.mysql.OperationPerformanceStatsRepository;
import com.mes.factory.repository.mysql.PoStatusSnapshotRepository;
import com.mes.factory.repository.mysql.RejectionAnalysisSummaryRepository;
import com.mes.factory.repository.mysql.WorkerPerformanceMonthlyRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.PurchaseOrderRepository;
import com.mes.factory.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
public class AnalyticsController {

    private final GaugeRepository gaugeRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DailyProductionSummaryRepository dailyProductionSummaryRepository;
    private final WorkerPerformanceMonthlyRepository workerPerformanceMonthlyRepository;
    private final PoStatusSnapshotRepository poStatusSnapshotRepository;
    private final RejectionAnalysisSummaryRepository rejectionAnalysisSummaryRepository;
    private final OperationPerformanceStatsRepository operationPerformanceStatsRepository;

    public AnalyticsController(GaugeRepository gaugeRepository,
                                GaugeOperationRepository gaugeOperationRepository,
                                PurchaseOrderRepository purchaseOrderRepository,
                                DailyProductionSummaryRepository dailyProductionSummaryRepository,
                                WorkerPerformanceMonthlyRepository workerPerformanceMonthlyRepository,
                                PoStatusSnapshotRepository poStatusSnapshotRepository,
                                RejectionAnalysisSummaryRepository rejectionAnalysisSummaryRepository,
                                OperationPerformanceStatsRepository operationPerformanceStatsRepository) {
        this.gaugeRepository = gaugeRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.dailyProductionSummaryRepository = dailyProductionSummaryRepository;
        this.workerPerformanceMonthlyRepository = workerPerformanceMonthlyRepository;
        this.poStatusSnapshotRepository = poStatusSnapshotRepository;
        this.rejectionAnalysisSummaryRepository = rejectionAnalysisSummaryRepository;
        this.operationPerformanceStatsRepository = operationPerformanceStatsRepository;
    }

    @GetMapping("/dashboard-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardSummary(
            @AuthenticationPrincipal CustomUserDetails user) {
        var factoryId = user.getFactoryId();
        var today = LocalDate.now();
        var startOfDay = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        var endOfDay = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        Map<String, Object> summary = new HashMap<>();
        summary.put("completedGaugesToday", gaugeRepository.sumBatchQuantityByFactoryIdAndStatus(factoryId, GaugeStatus.COMPLETED));
        summary.put("operationsCompletedToday", gaugeOperationRepository.sumCompletedOperationsBatchQuantityToday(factoryId, startOfDay, endOfDay));
        summary.put("activeWorkers", gaugeOperationRepository.countActiveWorkers(factoryId));
        summary.put("operationsInProgress", gaugeOperationRepository.countInProgressOperations(factoryId));
        summary.put("operationsOverdue", gaugeOperationRepository.countOverdueOperations(factoryId));
        summary.put("posDueWithin7Days", purchaseOrderRepository.findPOsDueWithinDays(factoryId, 7).size());

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/daily-production")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDailyProduction(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : LocalDate.now().minusDays(7);
        LocalDate end = endDate != null ? LocalDate.parse(endDate) : LocalDate.now();
        UUID factoryId = user.getFactoryId();

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        LocalDate current = start;
        while (!current.isAfter(end)) {
            OffsetDateTime dayStart = current.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime dayEnd = current.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

            long opsCompleted = gaugeOperationRepository.sumCompletedOperationsBatchQuantityToday(factoryId, dayStart, dayEnd);

            Map<String, Object> entry = new HashMap<>();
            entry.put("summaryDate", current.toString());
            entry.put("operationsCompleted", opsCompleted);
            entry.put("gaugesCompleted", opsCompleted); // alias for chart compatibility
            entry.put("gaugesRejected", 0);
            result.add(entry);

            current = current.plusDays(1);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/worker-performance")
    public ResponseEntity<ApiResponse<List<WorkerPerformanceMonthly>>> getWorkerPerformance(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String yearMonth) {
        String month = yearMonth != null ? yearMonth : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return ResponseEntity.ok(ApiResponse.success(
                workerPerformanceMonthlyRepository.findByFactoryIdAndYearMonth(user.getFactoryId(), month)));
    }

    @GetMapping("/po-completion-tracker")
    public ResponseEntity<ApiResponse<List<PoStatusSnapshot>>> getPoCompletionTracker(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                poStatusSnapshotRepository.findByFactoryId(user.getFactoryId())));
    }

    @GetMapping("/rejection-analysis")
    public ResponseEntity<ApiResponse<List<RejectionAnalysisSummary>>> getRejectionAnalysis(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String periodMonth) {
        String month = periodMonth != null ? periodMonth : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return ResponseEntity.ok(ApiResponse.success(
                rejectionAnalysisSummaryRepository.findByFactoryIdAndPeriodMonth(user.getFactoryId(), month)));
    }

    @GetMapping("/operation-performance")
    public ResponseEntity<ApiResponse<List<OperationPerformanceStats>>> getOperationPerformance(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String statsMonth) {
        String month = statsMonth != null ? statsMonth : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return ResponseEntity.ok(ApiResponse.success(
                operationPerformanceStatsRepository.findByFactoryIdAndStatsMonth(user.getFactoryId(), month)));
    }
}
