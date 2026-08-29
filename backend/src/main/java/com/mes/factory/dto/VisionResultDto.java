package com.mes.factory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisionResultDto {
    private String partId;
    private String dataMatrix;
    private String overallResult;
    private String inspectionMethod;
    private String inspectedAt;
    private Integer defectsFound;
    private List<VisionCheckpointDto> checkpoints;
}
