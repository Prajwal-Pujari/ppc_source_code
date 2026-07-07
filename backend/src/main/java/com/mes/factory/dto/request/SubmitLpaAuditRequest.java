package com.mes.factory.dto.request;

import com.mes.factory.entity.postgres.LpaAuditType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class SubmitLpaAuditRequest {

    @NotNull
    private LpaAuditType auditType;

    @NotNull
    private UUID questionSetId;

    private UUID scheduleId;
    private UUID operationMasterId;
    private UUID gaugeMasterId;
    private UUID machineMasterId;

    private String shiftName;
    private String remarks;

    @NotNull
    private List<AnswerItem> answers;

    @Data
    public static class AnswerItem {
        @NotNull
        private UUID questionId;

        @NotNull
        private String status; // CONFORMING, NON_CONFORMING, NA

        private String actualValue;
        private String remarks;
        private String correctiveAction;
        private String assignedActionOwner;
    }
}
