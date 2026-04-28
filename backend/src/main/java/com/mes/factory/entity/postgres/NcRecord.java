package com.mes.factory.entity.postgres;

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
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "nc_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "operations", "ncRecords", "purchaseOrder", "poLineItem", "gaugeMaster", "factory"})
    private Gauge gauge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_operation_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "gauge", "assignedTo", "assignedBy"})
    private GaugeOperation gaugeOperation;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejection_category", nullable = false, length = 100)
    private RejectionCategory rejectionCategory;

    @Column(name = "rejection_reason", nullable = false, columnDefinition = "TEXT")
    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_taken", nullable = false, length = 30)
    private ActionTaken actionTaken;

    @Column(name = "rejected_quantity")
    @Builder.Default
    private Integer rejectedQuantity = 1;

    @Column(name = "deviation_note", columnDefinition = "TEXT")
    private String deviationNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "factory"})
    private User initiatedBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
