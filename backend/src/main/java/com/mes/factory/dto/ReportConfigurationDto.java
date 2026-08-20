package com.mes.factory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportConfigurationDto {
    private UUID id;
    private String customerLogo;
    private String customerName;
    private String docNo;
    private String revNo;
    private String issueDate;

    // In-Process
    private String inProcessDocNo;
    private String inProcessRevNo;
    private String inProcessIssueDate;

    // PDIR
    private String pdirDocNo;
    private String pdirRevNo;
    private String pdirIssueDate;

    // Setup
    private String setupDocNo;
    private String setupRevNo;
    private String setupIssueDate;

    // FAI
    private String faiDocNo;
    private String faiRevNo;
    private String faiIssueDate;

    // Layout
    private String layoutDocNo;
    private String layoutRevNo;
    private String layoutIssueDate;
}
