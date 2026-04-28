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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "po_status_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoStatusSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "factory_id", nullable = false)
    private UUID factoryId;

    @Column(name = "po_id", nullable = false)
    private UUID poId;

    @Column(name = "po_number")
    private String poNumber;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "total_gauges")
    @Builder.Default
    private Integer totalGauges = 0;

    @Column(name = "completed_gauges")
    @Builder.Default
    private Integer completedGauges = 0;

    @Column(name = "rejected_gauges")
    @Builder.Default
    private Integer rejectedGauges = 0;

    @Column(name = "percent_complete", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal percentComplete = BigDecimal.ZERO;

    @Column(name = "expected_delivery")
    private LocalDate expectedDelivery;

    @Column(name = "snapshot_at")
    private LocalDateTime snapshotAt;
}
