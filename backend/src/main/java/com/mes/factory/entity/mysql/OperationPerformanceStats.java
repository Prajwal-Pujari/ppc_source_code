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
@Table(name = "operation_performance_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationPerformanceStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "factory_id", nullable = false)
    private UUID factoryId;

    @Column(name = "operation_name")
    private String operationName;

    @Column(name = "std_time_hours", precision = 6, scale = 2)
    private BigDecimal stdTimeHours;

    @Column(name = "avg_actual_time_hours", precision = 8, scale = 2)
    private BigDecimal avgActualTimeHours;

    @Column(name = "sample_count")
    @Builder.Default
    private Integer sampleCount = 0;

    @Column(name = "stats_month", length = 7)
    private String statsMonth;
}
