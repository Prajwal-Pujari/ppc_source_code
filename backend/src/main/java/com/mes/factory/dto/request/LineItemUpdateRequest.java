package com.mes.factory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LineItemUpdateRequest {
    @NotNull(message = "Quantity is required")
    private Integer quantity;
}
