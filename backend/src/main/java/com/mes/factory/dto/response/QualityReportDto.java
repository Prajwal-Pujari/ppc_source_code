package com.mes.factory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class QualityReportDto {
    private UUID poId;
    private String poNumber;
    private String customerName;
    private UUID gaugeId;
    private String serialNumber;
    private String partName; // from gaugeMaster
    private Integer targetQuantity;
    private String reportType; // IN_PROCESS, PDIR, NCR, LAYOUT
    private OffsetDateTime generatedAt;

    private String customerLogo;
    private String docNo;
    private String revNo;
    private String issueDate;
    private Double inspectionIntervalHours;
    private Double defaultShiftHours;

    private String gaugeStatus;
    private Boolean isInspectionCompleted;
    private Integer totalOperations;
    private Integer completedOperations;

    private List<ApprovalDto> approvals;
    private List<OperationLogDto> operations;

    @Data
    @Builder
    public static class ApprovalDto {
        private UUID shiftId;
        private String shiftName;
        private String inspectionDate;
        private String inspectorName;
        private String signature;
        private OffsetDateTime approvedAt;
        private String qualityRemark;
        private String additionalNote;
        private String approverDesignation;
    }

    @Data
    @Builder
    public static class OperationLogDto {
        private UUID operationId;
        private String operationName;
        private String operationCode;
        private String operationStatus;
        private Integer sequenceOrder;
        private List<BatchLogDto> batches;
        private List<MeasurementDto> configuredParameters;
    }

    @Data
    @Builder
    public static class BatchLogDto {
        private UUID logId;
        private OffsetDateTime logTime;
        private String inspectorName;
        private Integer inspectedQty;
        private Integer passedQty;
        private Integer rejectedQty;
        private Integer reworkQty;
        private Integer scrapQty;
        private String remarks;
        private String shiftName;
        private String machineName;
        private String incidentType;
        private Integer incidentDurationMins;
        private String incidentRemarks;
        private List<MeasurementDto> measurements;
    }

    @Data
    @Builder
    public static class MeasurementDto {
        private String questionId;
        private String parameterName;
        private String expectedAnswer;
        private BigDecimal minValue;
        private BigDecimal maxValue;
        private String unit;
        private Object actualValue; // Could be boolean, numeric, or text
        private String checkingMethod;
        private Boolean showInPdir;
    }
}
