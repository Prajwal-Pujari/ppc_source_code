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

import java.util.UUID;

@Entity
@Table(name = "rejection_analysis_summary")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectionAnalysisSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "factory_id", nullable = false)
    private UUID factoryId;

    @Column(name = "period_month", length = 7)
    private String periodMonth;

    @Column(name = "rejection_category")
    private String rejectionCategory;

    @Column(name = "gauge_type_name")
    private String gaugeTypeName;

    @Column(name = "operation_name")
    private String operationName;

    @Column(name = "worker_name")
    private String workerName;

    @Column(name = "rejection_count")
    @Builder.Default
    private Integer rejectionCount = 0;
}
