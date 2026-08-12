package com.mes.factory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MachineScheduleEventDto {
    private UUID machineId;
    private String machineName;
    private String poNumber;
    private String partName;
    private String operationName;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isCompleted;
    private String poStatus;
}
