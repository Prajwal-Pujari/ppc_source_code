package com.mes.factory.entity.postgres;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "po_line_item_operations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoLineItemOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_line_item_id", nullable = false)
    private PoLineItem poLineItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_master_id", nullable = false)
    private OperationMaster operationMaster;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_master_id")
    private MachineMaster machineMaster;

    @Column(name = "cycle_time_mins", precision = 10, scale = 2)
    private java.math.BigDecimal cycleTimeMins;
}
