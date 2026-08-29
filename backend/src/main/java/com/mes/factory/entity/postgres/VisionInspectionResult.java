package com.mes.factory.entity.postgres;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "vision_inspection_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisionInspectionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @Column(name = "part_id", nullable = false)
    private String partId;

    @Column(name = "data_matrix")
    private String dataMatrix;

    @Column(name = "overall_result", nullable = false)
    private String overallResult; // PASS or FAIL

    @Column(name = "inspection_method")
    private String inspectionMethod;

    @Column(name = "inspected_at")
    private OffsetDateTime inspectedAt;

    @Column(name = "defects_found")
    @Builder.Default
    private Integer defectsFound = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "result", cascade = CascadeType.ALL, orphanRemoval = true, fetch = jakarta.persistence.FetchType.EAGER)
    @Builder.Default
    private List<VisionInspectionCheckpoint> checkpoints = new ArrayList<>();
}
