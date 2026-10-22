package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.List;

@Entity
@Table(name = "pqc_inspection_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PqcInspectionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_operation_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private GaugeOperation gaugeOperation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Gauge gauge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_plan_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PqcInspectionPlan inspectionPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspector_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User inspector;

    @Column(name = "log_time", nullable = false)
    private OffsetDateTime logTime;

    @PrePersist
    public void prePersist() {
        if (this.logTime == null) {
            this.logTime = OffsetDateTime.now();
        }
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private FactoryShift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MachineMaster machine;

    @Column(name = "planned_qty", nullable = false)
    @Builder.Default
    private Integer plannedQty = 0;

    @Column(name = "actual_qty", nullable = false)
    @Builder.Default
    private Integer actualQty = 0;

    @Column(name = "passed_qty", nullable = false)
    @Builder.Default
    private Integer passedQty = 0;

    @Column(name = "rejected_qty", nullable = false)
    @Builder.Default
    private Integer rejectedQty = 0;

    @Column(name = "rework_qty", nullable = false)
    @Builder.Default
    private Integer reworkQty = 0;

    @Column(name = "scrap_qty", nullable = false)
    @Builder.Default
    private Integer scrapQty = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rejection_reasons", columnDefinition = "jsonb")
    private List<Map<String, Object>> rejectionReasons;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "measurement_data", columnDefinition = "jsonb")
    private Map<String, Object> measurementData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "question_answers", columnDefinition = "jsonb")
    private List<Map<String, Object>> questionAnswers;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "reviewer_remarks", columnDefinition = "TEXT")
    private String reviewerRemarks;

    @Column(name = "incident_type", length = 100)
    private String incidentType;

    @Column(name = "incident_duration_mins")
    private Integer incidentDurationMins;

    @Column(name = "incident_remarks", columnDefinition = "TEXT")
    private String incidentRemarks;

    @Column(name = "slot_index")
    private Integer slotIndex;

    @Column(name = "is_escalated")
    @Builder.Default
    private Boolean isEscalated = false;

    @Column(name = "escalated_to", length = 100)
    private String escalatedTo;

    @Column(name = "escalation_reason", columnDefinition = "TEXT")
    private String escalationReason;

    @Column(name = "is_backfill")
    @Builder.Default
    private Boolean isBackfill = false;
}
