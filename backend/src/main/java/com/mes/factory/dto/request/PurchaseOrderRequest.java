package com.mes.factory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderRequest {

    @NotBlank(message = "PO number is required")
    private String poNumber;

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    private LocalDate expectedDeliveryDate;
    private String priority;
    private String specialInstructions;

    @Valid
    private List<LineItemRequest> lineItems;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineItemRequest {
        @NotNull(message = "Gauge master ID is required")
        private UUID gaugeMasterId;

        @NotBlank(message = "Nominal size is required")
        private String nominalSize;

        private String sizeUnit;

        @NotNull(message = "Quantity is required")
        private Integer quantity;

        private String materialGradeOverride;
        private String lineNotes;

        private String toleranceType;
        private BigDecimal higherSize;
        private BigDecimal lowerSize;

        private List<OperationOverride> operations;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OperationOverride {
        private UUID operationMasterId;
        private Integer sequenceOrder;
        private Boolean isMandatory;
    }
}
