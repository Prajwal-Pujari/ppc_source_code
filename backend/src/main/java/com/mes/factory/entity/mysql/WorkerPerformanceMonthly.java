package com.mes.factory.entity.mysql;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "worker_performance_monthly")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerPerformanceMonthly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "factory_id", nullable = false)
    private UUID factoryId;

    @Column(name = "worker_id", nullable = false)
    private UUID workerId;

    @Column(name = "worker_name")
    private String workerName;

    @Column(name = "performance_month", length = 7)
    private String yearMonth;

    @Column(name = "operations_completed")
    @Builder.Default
    private Integer operationsCompleted = 0;

    @Column(name = "avg_minutes_per_operation", precision = 8, scale = 2)
    private BigDecimal avgMinutesPerOperation;

    @Column(name = "rejection_count")
    @Builder.Default
    private Integer rejectionCount = 0;

    @Column(name = "rework_count")
    @Builder.Default
    private Integer reworkCount = 0;
}
