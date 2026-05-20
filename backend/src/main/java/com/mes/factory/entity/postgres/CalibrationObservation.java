package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "calibration_observations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalibrationObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_operation_id", nullable = false)
    @JsonIgnore
    private GaugeOperation gaugeOperation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "operations", "ncRecords", "factory"})
    private Gauge gauge;

    @Column(name = "unit_number", nullable = false)
    private Integer unitNumber;

    @Column(name = "nominal_go", precision = 10, scale = 4)
    private BigDecimal nominalGo;

    @Column(name = "nominal_nogo", precision = 10, scale = 4)
    private BigDecimal nominalNogo;

    @Column(name = "specified_go_plus", precision = 10, scale = 4)
    private BigDecimal specifiedGoPlus;

    @Column(name = "specified_go_minus", precision = 10, scale = 4)
    private BigDecimal specifiedGoMinus;

    @Column(name = "specified_nogo_plus", precision = 10, scale = 4)
    private BigDecimal specifiedNogoPlus;

    @Column(name = "specified_nogo_minus", precision = 10, scale = 4)
    private BigDecimal specifiedNogoMinus;

    @Column(name = "wear_limit", precision = 10, scale = 4)
    private BigDecimal wearLimit;

    @Column(name = "observed_go", precision = 10, scale = 4)
    private BigDecimal observedGo;

    @Column(name = "observed_nogo", precision = 10, scale = 4)
    private BigDecimal observedNogo;

    @Column(name = "result", length = 20)
    @Builder.Default
    private String result = "PENDING";

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User recordedBy;

    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
