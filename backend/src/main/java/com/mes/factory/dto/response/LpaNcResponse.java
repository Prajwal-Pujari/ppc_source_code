package com.mes.factory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class LpaNcResponse {
    private UUID answerId;
    private UUID auditLogId;
    private OffsetDateTime auditDate;
    private String auditedByName;
    private String shiftName;
    private String targetName; // Operation, Machine, Gauge
    
    private String questionText;
    private String actualValue;
    private String remarks;
    
    private String assignedActionOwner;
    private String correctiveAction;
    private String actionStatus; // OPEN, PENDING_APPROVAL, CLOSED, ESCALATED
    
    private String evidenceFileUrl;
    private OffsetDateTime targetClosureDate;
    private String approvedBy;
    private String escalatedTo;
}
