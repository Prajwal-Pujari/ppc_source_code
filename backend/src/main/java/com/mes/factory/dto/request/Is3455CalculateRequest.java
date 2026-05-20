package com.mes.factory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Is3455CalculateRequest {
    private String toleranceType;
    private String nominalSize;
    private BigDecimal higherSize;
    private BigDecimal lowerSize;
}
