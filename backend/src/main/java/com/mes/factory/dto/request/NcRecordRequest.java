package com.mes.factory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NcRecordRequest {

    @NotNull(message = "Gauge ID is required")
    private UUID gaugeId;

    @NotNull(message = "Gauge operation ID is required")
    private UUID gaugeOperationId;

    @NotNull(message = "Rejection category is required")
    private String rejectionCategory;

    @NotNull(message = "Rejection reason is required")
    private String rejectionReason;

    @NotNull(message = "Action taken is required")
    private String actionTaken;

    private String deviationNote;

    // For REWORK: list of operation master IDs to re-run
    private List<UUID> reworkOperationIds;

    private Integer rejectedQuantity;
}
