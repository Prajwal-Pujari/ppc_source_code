package com.mes.factory.entity.mysql;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_production_summary",
        uniqueConstraints = @UniqueConstraint(columnNames = {"factory_id", "summary_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyProductionSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "factory_id", nullable = false)
    private UUID factoryId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Column(name = "gauges_completed")
    @Builder.Default
    private Integer gaugesCompleted = 0;

    @Column(name = "gauges_rejected")
    @Builder.Default
    private Integer gaugesRejected = 0;

    @Column(name = "operations_completed")
    @Builder.Default
    private Integer operationsCompleted = 0;

    @Column(name = "rejection_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal rejectionRate = BigDecimal.ZERO;
}
