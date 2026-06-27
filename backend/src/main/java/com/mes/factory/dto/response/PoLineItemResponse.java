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
    private String nominalSize;
    private String sizeUnit;
    private Integer quantity;
    private String materialGradeOverride;
    private String lineNotes;
    private String customerSrNumber;
    private String manufactureNumber;
    
    private String toleranceType;
    private BigDecimal higherSize;
    private BigDecimal lowerSize;
    private BigDecimal workpieceToleranceT;
    private BigDecimal gaugeToleranceH;
    private BigDecimal wearAllowanceY;
    private BigDecimal gaugeAllowanceZ;
    private BigDecimal wearLimit;
    private BigDecimal goSize;
    private BigDecimal nogoSize;
    private BigDecimal goTolPlus;
    private BigDecimal goTolMinus;
    private BigDecimal nogoTolPlus;
    private BigDecimal nogoTolMinus;
    private BigDecimal nogoWearAllowanceA;

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