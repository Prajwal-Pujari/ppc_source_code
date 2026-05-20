package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "po_line_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    @JsonIgnore
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "operations", "factory"})
    private GaugeMaster gaugeMaster;

    @Column(name = "nominal_size", nullable = false, length = 100)
    private String nominalSize;

    @Column(name = "size_unit", length = 20)
    @Builder.Default
    private String sizeUnit = "mm";

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "material_grade_override", length = 100)
    private String materialGradeOverride;

    @Column(name = "line_notes", columnDefinition = "TEXT")
    private String lineNotes;

    @Column(name = "tolerance_type", length = 20)
    private String toleranceType;

    @Column(name = "higher_size", precision = 10, scale = 4)
    private BigDecimal higherSize;

    @Column(name = "lower_size", precision = 10, scale = 4)
    private BigDecimal lowerSize;

    @Column(name = "workpiece_tolerance_t", precision = 10, scale = 4)
    private BigDecimal workpieceToleranceT;

    @Column(name = "gauge_tolerance_h", precision = 10, scale = 4)
    private BigDecimal gaugeToleranceH;

    @Column(name = "wear_allowance_y", precision = 10, scale = 4)
    private BigDecimal wearAllowanceY;

    @Column(name = "gauge_allowance_z", precision = 10, scale = 4)
    private BigDecimal gaugeAllowanceZ;

    @Column(name = "wear_limit", precision = 10, scale = 4)
    private BigDecimal wearLimit;

    @Column(name = "nogo_wear_allowance_a", precision = 10, scale = 4)
    private BigDecimal nogoWearAllowanceA;

    @Column(name = "go_size", precision = 10, scale = 4)
    private BigDecimal goSize;

    @Column(name = "nogo_size", precision = 10, scale = 4)
    private BigDecimal nogoSize;

    @Column(name = "go_tol_plus", precision = 10, scale = 4)
    private BigDecimal goTolPlus;

    @Column(name = "go_tol_minus", precision = 10, scale = 4)
    private BigDecimal goTolMinus;

    @Column(name = "nogo_tol_plus", precision = 10, scale = 4)
    private BigDecimal nogoTolPlus;

    @Column(name = "nogo_tol_minus", precision = 10, scale = 4)
    private BigDecimal nogoTolMinus;

    @Transient
    private String matchedRange;

    @Transient
    private Integer matchedGrade;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "poLineItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    @JsonIgnore
    private List<PoLineItemOperation> operations = new ArrayList<>();

    @OneToMany(mappedBy = "poLineItem")
    @Builder.Default
    @JsonIgnore
    private List<Gauge> gauges = new ArrayList<>();
}