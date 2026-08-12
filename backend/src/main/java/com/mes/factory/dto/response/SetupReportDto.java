package com.mes.factory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SetupReportDto {
    private UUID poId;
    private String poNumber;
    private String customerName;
    private UUID gaugeId;
    private String serialNumber;
    private String partName;
    private Integer targetQuantity;
    private OffsetDateTime generatedAt;
    private String customerLogo;
    private String docNo;
    private String revNo;
    private String issueDate;

    private List<SetupLogDto> logs;

    @Data
    @Builder
    public static class SetupLogDto {
        private UUID logId;
        private OffsetDateTime logTime;
        private String workerName;
        private String operationName;
        private String machineName;
        private String remarks;
        private Boolean isPassed;

        private List<SetupAnswerDto> answers;
    }

    @Data
    @Builder
    public static class SetupAnswerDto {
        private String questionText;
        private String questionType;
        private String expectedAnswer;
        private Double minValue;
        private Double maxValue;
        private String unit;
        private String answerValue;
    }
}
