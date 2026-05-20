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
import jakarta.persistence.OneToMany;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "operation_master")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Factory factory;

    @Column(name = "operation_name", nullable = false)
    private String operationName;

    @Column(name = "operation_code", nullable = false, length = 50)
    private String operationCode;

    @Column(length = 100)
    private String department;

    @Column(name = "standard_time_hours", precision = 6, scale = 2)
    private BigDecimal standardTimeHours;

    @Column(name = "skill_level", length = 50)
    private String skillLevel;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "is_outsourced")
    @Builder.Default
    private Boolean isOutsourced = false;

    @Column(name = "is_calibration")
    @Builder.Default
    private Boolean isCalibration = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "operationMaster")
    @Builder.Default
    @JsonIgnore
    private List<GaugeMasterOperation> gaugeMasterOperations = new ArrayList<>();
}
