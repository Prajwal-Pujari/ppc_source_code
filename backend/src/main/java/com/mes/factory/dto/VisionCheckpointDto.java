package com.mes.factory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisionCheckpointDto {
    private String id;
    private String name;
    private String balloon;
    private String expectedClass;
    private String aiClass;
    private Double aiConfidence;
    private String result;
    private String defectType;
}
