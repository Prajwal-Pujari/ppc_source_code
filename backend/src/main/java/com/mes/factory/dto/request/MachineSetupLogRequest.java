package com.mes.factory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MachineSetupLogRequest {

    private UUID poLineItemOperationId;
    private UUID questionSetId;
    private String remarks;
    private List<Answer> answers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Answer {
        private UUID questionId;
        private String answerValue;
    }
}
