package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "gauge_operations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GaugeOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "operations", "ncRecords", "factory"})
    private Gauge gauge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "gaugeMasterOperations", "factory"})
    private OperationMaster operationMaster;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "factory"})
    private MachineMaster machineMaster;

    @Column(name = "cycle_time_mins")
    private java.math.BigDecimal cycleTimeMins;

    @Column(name = "operation_name", nullable = false)
    private String operationName;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private OperationStatus status = OperationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "factory"})
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "factory"})
    private User assignedBy;

    @Column(name = "assigned_at")
    private OffsetDateTime assignedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "factory"})
    private User completedBy;

    @Column(name = "scheduled_start")
    private OffsetDateTime scheduledStart;

    @Column(name = "scheduled_end")
    private OffsetDateTime scheduledEnd;

    @Column(name = "actual_start")
    private OffsetDateTime actualStart;

    @Column(name = "actual_end")
    private OffsetDateTime actualEnd;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "quality_params", columnDefinition = "jsonb")
    private Map<String, Object> qualityParams;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rework_of")
    @JsonIgnore
    private GaugeOperation reworkOf;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}