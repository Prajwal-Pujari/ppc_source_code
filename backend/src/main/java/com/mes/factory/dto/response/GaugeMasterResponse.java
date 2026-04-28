package com.mes.factory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class GaugeMasterResponse {
    private UUID id;
    private String gaugeTypeName;
    private String categoryCode;
    private String defaultMaterialGrade;
    private String unitOfMeasurement;
    private String notes;
    private Boolean isActive;

    // Only safe scalar fields from Factory — no proxy touching
    private UUID factoryId;
    private String factoryName;
}