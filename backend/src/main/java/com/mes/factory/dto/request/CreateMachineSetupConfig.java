package com.mes.factory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

@Data
public class CreateMachineSetupConfig {
    @NotNull
    private UUID machineMasterId;

    @NotNull
    private UUID operationMasterId;

    private UUID gaugeMasterId;

    @NotBlank
    private String name;

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
        private String checkingMethod;
    }
}
