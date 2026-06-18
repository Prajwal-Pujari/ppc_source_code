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
    private String docNo;
    private String revNo;
    private String issueDate;
}
