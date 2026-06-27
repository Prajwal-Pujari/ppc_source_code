package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
// import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "gauges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gauge {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id")
    // @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JsonIgnore
    private Factory factory;

    @Column(name = "serial_number", unique = true, nullable = false, length = 150)
    private String serialNumber;

    @Column(name = "customer_sr_number", length = 150)
    private String customerSrNumber;

    @Column(name = "manufacture_number", length = 150)
    private String manufactureNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "lineItems", "gauges", "comments", "factory"})
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_line_item_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "purchaseOrder", "operations"})
    private PoLineItem poLineItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "operations", "factory"})
    private GaugeMaster gaugeMaster;

    @Column(name = "gauge_type_name", nullable = false)
    private String gaugeTypeName;

    @Column(name = "nominal_size", nullable = false, length = 100)
    private String nominalSize;

    @Column(name = "size_unit", length = 20)
    @Builder.Default
    private String sizeUnit = "mm";

    @Column(name = "material_grade", length = 100)
    private String materialGrade;

    @Column(name = "batch_quantity")
    @Builder.Default
    private Integer batchQuantity = 1;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private GaugeStatus status = GaugeStatus.PENDING;

    @Column(name = "current_operation_id")
    private UUID currentOperationId;

    @Column(name = "rejection_count")
    @Builder.Default
    private Integer rejectionCount = 0;

    @Column(name = "is_calibration_approved")
    @Builder.Default
    private Boolean isCalibrationApproved = false;

    @Column(name = "approved_by_admin_name")
    private String approvedByAdminName;

    @Column(name = "approved_by_admin_sign", columnDefinition = "TEXT")
    private String approvedByAdminSign;

    @Column(name = "calibrator_name")
    private String calibratorName;

    @Column(name = "calibrator_sign", columnDefinition = "TEXT")
    private String calibratorSign;

    @Column(name = "qr_code_path", length = 500)
    private String qrCodePath;

    @Column(name = "history_card_path", length = 500)
    private String historyCardPath;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "gauge", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    @JsonIgnore
    private List<GaugeOperation> operations = new ArrayList<>();

    @OneToMany(mappedBy = "gauge")
    @Builder.Default
    @JsonIgnore
    private List<NcRecord> ncRecords = new ArrayList<>();
}
