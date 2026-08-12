package com.mes.factory.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DossierSummaryDto {
    private String poNumber;
    private String customerName;
    private String summaryText;
    private int totalGauges;
    private int completedGauges;
    private boolean allPassed;
}
