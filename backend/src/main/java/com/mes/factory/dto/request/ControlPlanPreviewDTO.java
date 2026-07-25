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
        private Boolean isExistingPart;
        private UUID existingGaugeMasterId;
        private List<OperationPreview> operations;

        public PartPreview() {}
        public PartPreview(String partNo, String partName, Boolean isExistingPart, UUID existingGaugeMasterId, List<OperationPreview> operations) {
            this.partNo = partNo;
            this.partName = partName;
            this.isExistingPart = isExistingPart;
            this.existingGaugeMasterId = existingGaugeMasterId;
            this.operations = operations;
        }

        public String getPartNo() { return partNo; }
        public void setPartNo(String partNo) { this.partNo = partNo; }
        public String getPartName() { return partName; }
        public void setPartName(String partName) { this.partName = partName; }
        public Boolean getIsExistingPart() { return isExistingPart; }
        public void setIsExistingPart(Boolean isExistingPart) { this.isExistingPart = isExistingPart; }
        public UUID getExistingGaugeMasterId() { return existingGaugeMasterId; }
        public void setExistingGaugeMasterId(UUID existingGaugeMasterId) { this.existingGaugeMasterId = existingGaugeMasterId; }
        public List<OperationPreview> getOperations() { return operations; }
        public void setOperations(List<OperationPreview> operations) { this.operations = operations; }
    }

    public static class OperationPreview {
        private String operationName;
        private String operationCode;
        private String department;
        private UUID existingOperationMasterId;
        private Double cycleTimeMins;
        private List<QuestionPreview> questions;

        public OperationPreview() {}
        public OperationPreview(String operationName, String operationCode, String department, UUID existingOperationMasterId, Double cycleTimeMins, List<QuestionPreview> questions) {
            this.operationName = operationName;
            this.operationCode = operationCode;
            this.department = department;
            this.existingOperationMasterId = existingOperationMasterId;
            this.cycleTimeMins = cycleTimeMins;
            this.questions = questions;
        }

        public String getOperationName() { return operationName; }
        public void setOperationName(String operationName) { this.operationName = operationName; }
        public String getOperationCode() { return operationCode; }
        public void setOperationCode(String operationCode) { this.operationCode = operationCode; }
        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }
        public UUID getExistingOperationMasterId() { return existingOperationMasterId; }
        public void setExistingOperationMasterId(UUID existingOperationMasterId) { this.existingOperationMasterId = existingOperationMasterId; }
        public Double getCycleTimeMins() { return cycleTimeMins; }
        public void setCycleTimeMins(Double cycleTimeMins) { this.cycleTimeMins = cycleTimeMins; }
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
