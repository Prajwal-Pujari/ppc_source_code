package com.mes.factory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class PqcInspectionLogRequest {

    @NotNull
    private UUID gaugeOperationId;

    private UUID shiftId; // Can be auto-detected or manually passed

    private UUID machineId; // Gamified machine tracking

    @NotNull
    private Integer actualQty;

    @NotNull
    private Integer passedQty;

    @NotNull
    private Integer rejectedQty;

    @NotNull
    private Integer reworkQty;

    @NotNull
    private Integer scrapQty;

    private List<Map<String, Object>> rejectionReasons;

    private Map<String, Object> measurementData;

    private List<Map<String, Object>> questionAnswers;

    private String remarks;

    private String incidentType;

    private Integer incidentDurationMins;

    private String incidentRemarks;
    
    private Integer slotIndex;

    private Boolean isBackfill;

    private java.time.OffsetDateTime logTime;

    private Boolean isEscalated;

    private String escalationReason;
}
