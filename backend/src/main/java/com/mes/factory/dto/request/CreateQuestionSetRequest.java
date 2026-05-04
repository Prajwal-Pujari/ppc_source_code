package com.mes.factory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateQuestionSetRequest {

    @NotNull
    private UUID operationMasterId;

    @NotBlank
    private String name;

    private String inspectionFrequency = "1/Hr";

    @Valid
    private List<QuestionItem> questions;

    @Data
    public static class QuestionItem {
        private Integer sequenceOrder;

        @NotBlank
        private String questionText;

        @NotBlank
        private String questionType; // PASS_FAIL, NUMERIC, TEXT, CHOICE

        private String expectedAnswer;
        private String unit;
        private BigDecimal minValue;
        private BigDecimal maxValue;
        private List<String> choices;
        private Boolean isCritical = false;
    }
}
