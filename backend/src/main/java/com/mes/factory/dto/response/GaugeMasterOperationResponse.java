package com.mes.factory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class GaugeMasterOperationResponse {
    private UUID id;
    private Integer sequenceOrder;
    private Boolean isMandatory;

    // Safe scalar fields from OperationMaster
    private UUID operationMasterId;
    private String operationName;
    private String operationCode;
    private java.math.BigDecimal cycleTimeMins;
    private java.math.BigDecimal setupTimeMins;
}