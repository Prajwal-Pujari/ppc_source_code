package com.mes.factory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Is3455CalculateResponse {
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
    private String matchedRange;
    private Integer matchedGrade;
}
