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
public class MachineMasterDto {
    private UUID id;
    private String machineName;
    private String machineCode;
    private String department;
    private Boolean isActive;
    private String currentStatus;
    private java.time.OffsetDateTime activeOperationEndsAt;
    private String activeOperationName;
    private String activeGaugeSerial;
}
