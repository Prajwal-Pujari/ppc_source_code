package com.mes.factory.dto.request;

import com.mes.factory.entity.postgres.LpaAuditType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CreateLpaScheduleRequest {

    @NotNull
    private LpaAuditType auditType;

    @NotNull
    private UUID questionSetId;

    private UUID operationMasterId;
    private UUID gaugeMasterId;
    private UUID machineMasterId;

    private UUID assignedToId;
    private String assignedRole;

    private String frequency = "DAILY"; // DAILY, WEEKLY, MONTHLY, SHIFT_WISE

    @NotNull
    private OffsetDateTime nextDueDate;
}
