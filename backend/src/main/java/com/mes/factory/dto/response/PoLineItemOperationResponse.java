package com.mes.factory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoLineItemOperationResponse {
    private UUID id;
    private UUID operationMasterId;
    private String operationName;
    private String operationCode;
    private String department;
    private Integer sequenceOrder;
    private Boolean isMandatory;
    private BigDecimal cycleTimeMins;
    
    private MachineMasterInfo machineMaster;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MachineMasterInfo {
        private UUID id;
        private String machineName;
        private String machineCode;
    }
}
