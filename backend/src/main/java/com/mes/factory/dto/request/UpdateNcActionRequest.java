package com.mes.factory.dto.request;

import lombok.Data;

@Data
public class UpdateNcActionRequest {
    private String actionStatus; // OPEN, PENDING_APPROVAL, CLOSED, ESCALATED
    private String correctiveAction;
    private String assignedActionOwner;
    private String evidenceFileUrl;
    private String approvedBy;
    private String escalatedTo;
}
