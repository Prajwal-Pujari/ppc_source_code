package com.mes.factory.entity.postgres;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "report_configuration")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportConfiguration {

    @Id
    private String id;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "company_address", columnDefinition = "TEXT")
    private String companyAddress;

    @Column(name = "customer_logo", columnDefinition = "TEXT")
    private String customerLogo;

    @Column(name = "doc_no")
    private String docNo;

    @Column(name = "rev_no")
    private String revNo;

    @Column(name = "issue_date")
    private String issueDate;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
