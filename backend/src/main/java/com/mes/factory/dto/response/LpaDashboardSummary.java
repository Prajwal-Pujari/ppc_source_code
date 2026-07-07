package com.mes.factory.dto.response;

import com.mes.factory.entity.postgres.LpaAuditType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LpaDashboardSummary {

    private BigDecimal complianceRate;
    private Integer perfectStreak;
    private Long totalAuditsCompleted;
    private Long dueTodayCount;
    private Long overdueCount;
    private Long openActionItemsCount;

    private List<CategoryMetric> categoryMetrics;
    private List<AuditLogSummary> recentAudits;
    private List<ScheduleSummary> dueSchedules;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryMetric {
        private LpaAuditType auditType;
        private Long totalCompleted;
        private BigDecimal complianceRate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuditLogSummary {
        private UUID id;
        private LpaAuditType auditType;
        private String questionSetName;
        private String auditedByName;
        private String shiftName;
        private OffsetDateTime auditDate;
        private BigDecimal scorePercentage;
        private String overallStatus;
        private String targetName; // e.g. Machine name or Part name
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScheduleSummary {
        private UUID id;
        private LpaAuditType auditType;
        private String questionSetName;
        private String assignedToName;
        private String assignedRole;
        private String frequency;
        private OffsetDateTime nextDueDate;
        private String status;
        private String targetName;
    }
}
