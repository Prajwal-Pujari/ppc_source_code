package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lpa_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LpaAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Factory factory;

    @Enumerated(EnumType.STRING)
    @Column(name = "audit_type", nullable = false, length = 50)
    private LpaAuditType auditType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_set_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "questions"})
    private LpaQuestionSet questionSet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private LpaSchedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private OperationMaster operationMaster;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private GaugeMaster gaugeMaster;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_master_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MachineMaster machineMaster;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audited_by_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})
    private User auditedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auditee_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})
    private User auditee;

    @Column(name = "shift_name", length = 50)
    private String shiftName;

    @Column(name = "audit_date", nullable = false)
    private OffsetDateTime auditDate;

    @Column(name = "score_percentage", precision = 5, scale = 2)
    private BigDecimal scorePercentage;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    @Column(name = "conforming_count")
    private Integer conformingCount;

    @Column(name = "non_conforming_count")
    private Integer nonConformingCount;

    @Column(name = "na_count")
    private Integer naCount;

    @Column(name = "overall_status", length = 30)
    @Builder.Default
    private String overallStatus = "PASS";

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "auditLog", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    @JsonManagedReference
    private List<LpaAuditLogAnswer> answers = new ArrayList<>();
}
