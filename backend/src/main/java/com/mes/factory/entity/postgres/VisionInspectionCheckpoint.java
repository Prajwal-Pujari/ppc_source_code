package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "vision_inspection_checkpoints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisionInspectionCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_id", nullable = false)
    @JsonIgnore
    private VisionInspectionResult result;

    @Column(name = "checkpoint_id")
    private String checkpointId;

    @Column(name = "checkpoint_name", nullable = false)
    private String checkpointName;

    @Column(name = "balloon")
    private String balloon;

    @Column(name = "expected_class")
    private String expectedClass;

    @Column(name = "ai_class")
    private String aiClass;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(name = "result", nullable = false)
    private String resultStatus; // PASS or FAIL

    @Column(name = "defect_type")
    private String defectType;
}
