package com.mes.factory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderResponse {
    private UUID id;
    private String poNumber;
    private String customerName;
    private UUID customerId;
    private String partName;
    private LocalDate orderDate;
    private LocalDate expectedDeliveryDate;
    private String priority;
    private String status;
    private Integer totalGauges;
    private Integer completedGauges;
    private Integer rejectedGauges;
    private Integer targetQuantity;
    private Integer producedQuantity;
    private Integer rejectedQuantity;
    private Integer scrappedQuantity;
    private String specialInstructions;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}