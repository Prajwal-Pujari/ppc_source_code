package com.mes.factory.controller;

import com.mes.factory.dto.request.PurchaseOrderRequest;
import com.mes.factory.dto.response.PurchaseOrderResponse;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.dto.response.PoLineItemResponse;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.PoLineItem;
import com.mes.factory.entity.postgres.PurchaseOrder;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.PurchaseOrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
        public ResponseEntity<ApiResponse<Page<PurchaseOrderResponse>>> getPurchaseOrders(
                @AuthenticationPrincipal CustomUserDetails user,
                @RequestParam(required = false) String status,
                @RequestParam(required = false) String search,
                Pageable pageable) {
            return ResponseEntity.ok(ApiResponse.success(
                    purchaseOrderService.getPurchaseOrders(user.getFactoryId(), status, search, pageable)));
        }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrder>> getPurchaseOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseOrderService.getPurchaseOrder(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<PurchaseOrder>> createDraft(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PurchaseOrderRequest request) {
        PurchaseOrder po = purchaseOrderService.createDraft(user.getFactoryId(), user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(po, "Purchase order draft created"));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<PurchaseOrder>> confirmPO(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails user) {
        PurchaseOrder po = purchaseOrderService.confirmPO(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.success(po, "Purchase order confirmed"));
    }

    @GetMapping("/{id}/gauges")
    public ResponseEntity<ApiResponse<List<Gauge>>> getPOGauges(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseOrderService.getPurchaseOrderGauges(id)));
    }

   @GetMapping("/{id}/line-items")
public ResponseEntity<ApiResponse<List<PoLineItemResponse>>> getPOLineItems(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(purchaseOrderService.getPurchaseOrderLineItems(id)));
}
    @PostMapping("/{id}/line-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<PoLineItem>> addLineItem(
            @PathVariable UUID id,
            @RequestBody PurchaseOrderRequest.LineItemRequest request) {
        PoLineItem item = purchaseOrderService.addLineItem(id, request);
        return ResponseEntity.ok(ApiResponse.success(item, "Line item added"));
    }

    @DeleteMapping("/{id}/line-items/{lineItemId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<Void>> deleteLineItem(
            @PathVariable UUID id, @PathVariable UUID lineItemId) {
        purchaseOrderService.deleteLineItem(id, lineItemId);
        return ResponseEntity.ok(ApiResponse.success(null, "Line item removed"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancelPO(@PathVariable UUID id) {
        purchaseOrderService.cancelPO(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Purchase order cancelled"));
    }
}
