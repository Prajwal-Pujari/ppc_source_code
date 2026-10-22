package com.mes.factory.entity.postgres;

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

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_configuration")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Factory factory;

    @Column(name = "customer_logo", columnDefinition = "TEXT")
    private String customerLogo;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Column(name = "doc_no", length = 100)
    private String docNo;

    @Column(name = "rev_no", length = 100)
    private String revNo;

    @Column(name = "issue_date", length = 100)
    private String issueDate;

    // In-Process
    @Column(name = "in_process_doc_no", length = 100)
    private String inProcessDocNo;

    @Column(name = "in_process_rev_no", length = 100)
    private String inProcessRevNo;

    @Column(name = "in_process_issue_date", length = 100)
    private String inProcessIssueDate;

    // PDIR
    @Column(name = "pdir_doc_no", length = 100)
    private String pdirDocNo;

    @Column(name = "pdir_rev_no", length = 100)
    private String pdirRevNo;

    @Column(name = "pdir_issue_date", length = 100)
    private String pdirIssueDate;

    // Setup
    @Column(name = "setup_doc_no", length = 100)
    private String setupDocNo;

    @Column(name = "setup_rev_no", length = 100)
    private String setupRevNo;

    @Column(name = "setup_issue_date", length = 100)
    private String setupIssueDate;

    // FAI
    @Column(name = "fai_doc_no", length = 100)
    private String faiDocNo;

    @Column(name = "fai_rev_no", length = 100)
    private String faiRevNo;

    @Column(name = "fai_issue_date", length = 100)
    private String faiIssueDate;

    // Layout
    @Column(name = "layout_doc_no", length = 100)
    private String layoutDocNo;

    @Column(name = "layout_rev_no", length = 100)
    private String layoutRevNo;

    @Column(name = "layout_issue_date", length = 100)
    private String layoutIssueDate;

    @Column(name = "inspection_interval_hours")
    @Builder.Default
    private Double inspectionIntervalHours = 1.0;

    @Column(name = "default_shift_hours")
    @Builder.Default
    private Double defaultShiftHours = 8.0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
