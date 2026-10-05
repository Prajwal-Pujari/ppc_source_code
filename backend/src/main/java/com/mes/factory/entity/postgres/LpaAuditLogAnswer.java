package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "lpa_audit_log_answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LpaAuditLogAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_log_id", nullable = false)
    @JsonBackReference
    private LpaAuditLog auditLog;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "sequence_order")
    private Integer sequenceOrder;

    @Column(name = "is_critical")
    @Builder.Default
    private Boolean isCritical = false;

    @Column(nullable = false, length = 30)
    private String status; // CONFORMING, NON_CONFORMING, NA

    @Column(name = "actual_value", columnDefinition = "TEXT")
    private String actualValue;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(name = "assigned_action_owner", length = 100)
    private String assignedActionOwner;

    @Column(name = "action_status", length = 30)
    @Builder.Default
    private String actionStatus = "OPEN";

    @Column(name = "evidence_file_url")
    private String evidenceFileUrl;

    @Column(name = "target_closure_date")
    private OffsetDateTime targetClosureDate;

    @Column(name = "escalated_to", length = 100)
    private String escalatedTo;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;
}
