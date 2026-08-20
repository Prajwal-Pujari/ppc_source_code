package com.mes.factory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderUpdateRequest {
    private String workOrderNo;
    private LocalDate orderDate;
    private LocalDate expectedDeliveryDate;
}
