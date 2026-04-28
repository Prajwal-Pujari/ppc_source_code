package com.mes.factory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoLineItemResponse {

    private UUID id;
    private BigDecimal nominalSize;
    private String sizeUnit;
    private Integer quantity;
    private String materialGradeOverride;
    private String lineNotes;

    private GaugeMasterInfo gaugeMaster;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GaugeMasterInfo {
        private UUID id;
        private String gaugeTypeName;
        private String categoryCode;
        private String defaultMaterialGrade;
        private String unitOfMeasurement;
    }
}