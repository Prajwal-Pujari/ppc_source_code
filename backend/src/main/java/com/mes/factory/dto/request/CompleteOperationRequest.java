package com.mes.factory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompleteOperationRequest {

    private String remarks;
    private Map<String, Object> qualityParams;
}
