package com.mes.factory.dto.request;

import com.mes.factory.entity.postgres.LpaAuditType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateLpaQuestionSetRequest {

    @NotNull
    private LpaAuditType auditType;

    @NotBlank
    private String name;

    private String description;

    private UUID operationMasterId;
    private UUID gaugeMasterId;
    private UUID machineMasterId;

    private String defaultFrequency = "DAILY";

    @Valid
    private List<QuestionItem> questions;

    @Data
    public static class QuestionItem {
        private Integer sequenceOrder;

        @NotBlank
        private String questionText;

        @NotBlank
        private String questionType; // PASS_FAIL, YES_NO, NUMERIC, TEXT, MULTIPLE_CHOICE

        private String expectedAnswer;
        private String unit;
        private BigDecimal minValue;
        private BigDecimal maxValue;
        private List<String> choices;
        private Boolean isCritical = false;
        private String checkingMethod;
        private String reactionPlan;
    }
}
