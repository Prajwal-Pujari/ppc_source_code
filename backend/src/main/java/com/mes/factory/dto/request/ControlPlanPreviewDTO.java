package com.mes.factory.dto.request;

import java.util.List;
import java.util.UUID;

public class ControlPlanPreviewDTO {
    private List<PartPreview> parts;

    public ControlPlanPreviewDTO() {}
    public ControlPlanPreviewDTO(List<PartPreview> parts) { this.parts = parts; }

    public List<PartPreview> getParts() { return parts; }
    public void setParts(List<PartPreview> parts) { this.parts = parts; }

    public static class PartPreview {
        private String partNo;
        private String partName;
        private List<OperationPreview> operations;

        public PartPreview() {}
        public PartPreview(String partNo, String partName, List<OperationPreview> operations) {
            this.partNo = partNo;
            this.partName = partName;
            this.operations = operations;
        }

        public String getPartNo() { return partNo; }
        public void setPartNo(String partNo) { this.partNo = partNo; }
        public String getPartName() { return partName; }
        public void setPartName(String partName) { this.partName = partName; }
        public List<OperationPreview> getOperations() { return operations; }
        public void setOperations(List<OperationPreview> operations) { this.operations = operations; }
    }

    public static class OperationPreview {
        private String operationName;
        private String operationCode;
        private UUID existingOperationMasterId;
        private List<QuestionPreview> questions;

        public OperationPreview() {}
        public OperationPreview(String operationName, String operationCode, UUID existingOperationMasterId, List<QuestionPreview> questions) {
            this.operationName = operationName;
            this.operationCode = operationCode;
            this.existingOperationMasterId = existingOperationMasterId;
            this.questions = questions;
        }

        public String getOperationName() { return operationName; }
        public void setOperationName(String operationName) { this.operationName = operationName; }
        public String getOperationCode() { return operationCode; }
        public void setOperationCode(String operationCode) { this.operationCode = operationCode; }
        public UUID getExistingOperationMasterId() { return existingOperationMasterId; }
        public void setExistingOperationMasterId(UUID existingOperationMasterId) { this.existingOperationMasterId = existingOperationMasterId; }
        public List<QuestionPreview> getQuestions() { return questions; }
        public void setQuestions(List<QuestionPreview> questions) { this.questions = questions; }
    }

    public static class QuestionPreview {
        private Integer sequenceOrder;
        private String questionText;
        private String questionType;
        private String expectedAnswer;
        private Double minValue;
        private Double maxValue;
        private String checkingMethod;
        private Boolean isCritical;

        public QuestionPreview() {}
        public QuestionPreview(Integer sequenceOrder, String questionText, String questionType, String expectedAnswer, Double minValue, Double maxValue, String checkingMethod, Boolean isCritical) {
            this.sequenceOrder = sequenceOrder;
            this.questionText = questionText;
            this.questionType = questionType;
            this.expectedAnswer = expectedAnswer;
            this.minValue = minValue;
            this.maxValue = maxValue;
            this.checkingMethod = checkingMethod;
            this.isCritical = isCritical;
        }

        public Integer getSequenceOrder() { return sequenceOrder; }
        public void setSequenceOrder(Integer sequenceOrder) { this.sequenceOrder = sequenceOrder; }
        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }
        public String getQuestionType() { return questionType; }
        public void setQuestionType(String questionType) { this.questionType = questionType; }
        public String getExpectedAnswer() { return expectedAnswer; }
        public void setExpectedAnswer(String expectedAnswer) { this.expectedAnswer = expectedAnswer; }
        public Double getMinValue() { return minValue; }
        public void setMinValue(Double minValue) { this.minValue = minValue; }
        public Double getMaxValue() { return maxValue; }
        public void setMaxValue(Double maxValue) { this.maxValue = maxValue; }
        public String getCheckingMethod() { return checkingMethod; }
        public void setCheckingMethod(String checkingMethod) { this.checkingMethod = checkingMethod; }
        public Boolean getIsCritical() { return isCritical != null ? isCritical : false; }
        public void setIsCritical(Boolean isCritical) { this.isCritical = isCritical; }
    }
}
