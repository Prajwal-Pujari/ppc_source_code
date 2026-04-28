package com.mes.factory.service;

import com.mes.factory.audit.Auditable;
import com.mes.factory.dto.request.PurchaseOrderRequest;
import com.mes.factory.dto.response.PurchaseOrderResponse;
import com.mes.factory.entity.postgres.Customer;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeMaster;
import com.mes.factory.entity.postgres.GaugeMasterOperation;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.GaugeStatus;
import com.mes.factory.entity.postgres.OperationMaster;
import com.mes.factory.entity.postgres.OperationStatus;
import com.mes.factory.entity.postgres.PoLineItem;
import com.mes.factory.entity.postgres.PoLineItemOperation;
import com.mes.factory.entity.postgres.PoStatus;
import com.mes.factory.entity.postgres.PriorityLevel;
import com.mes.factory.entity.postgres.PurchaseOrder;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.exception.BusinessException;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.GaugeMasterRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.OperationMasterRepository;
import com.mes.factory.repository.postgres.PoLineItemRepository;
import com.mes.factory.repository.postgres.PurchaseOrderRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.websocket.MesEventPublisher;
import com.mes.factory.websocket.WebSocketEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import com.mes.factory.dto.response.PoLineItemResponse;

@Service
public class PurchaseOrderService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseOrderService.class);

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PoLineItemRepository poLineItemRepository;
    private final GaugeRepository gaugeRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final GaugeMasterRepository gaugeMasterRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final FactoryRepository factoryRepository;
    private final UserRepository userRepository;
    private final CustomerService customerService;
    private final GaugeMasterService gaugeMasterService;
    private final QrCodeService qrCodeService;
    private final MesEventPublisher eventPublisher;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository,
                                 PoLineItemRepository poLineItemRepository,
                                 GaugeRepository gaugeRepository,
                                 GaugeOperationRepository gaugeOperationRepository,
                                 GaugeMasterRepository gaugeMasterRepository,
                                 OperationMasterRepository operationMasterRepository,
                                 FactoryRepository factoryRepository,
                                 UserRepository userRepository,
                                 CustomerService customerService,
                                 GaugeMasterService gaugeMasterService,
                                 QrCodeService qrCodeService,
                                 MesEventPublisher eventPublisher) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.poLineItemRepository = poLineItemRepository;
        this.gaugeRepository = gaugeRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.gaugeMasterRepository = gaugeMasterRepository;
        this.operationMasterRepository = operationMasterRepository;
        this.factoryRepository = factoryRepository;
        this.userRepository = userRepository;
        this.customerService = customerService;
        this.gaugeMasterService = gaugeMasterService;
        this.qrCodeService = qrCodeService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
public Page<PurchaseOrderResponse> getPurchaseOrders(UUID factoryId, String status, String search, Pageable pageable) {
    Page<PurchaseOrder> page;

    if (search != null && !search.isBlank()) {
        page = purchaseOrderRepository.searchByPoNumberOrCustomerName(factoryId, search, pageable);
    } else if (status != null && !status.isBlank()) {
        page = purchaseOrderRepository.findByFactoryIdAndStatus(factoryId, PoStatus.valueOf(status), pageable);
    } else {
        page = purchaseOrderRepository.findByFactoryId(factoryId, pageable);
    }

    return page.map(po -> PurchaseOrderResponse.builder()
            .id(po.getId())
            .poNumber(po.getPoNumber())
            .customerName(po.getCustomer() != null ? po.getCustomer().getName() : null)
            .customerId(po.getCustomer() != null ? po.getCustomer().getId() : null)
            .orderDate(po.getOrderDate())
            .expectedDeliveryDate(po.getExpectedDeliveryDate())
            .priority(po.getPriority() != null ? po.getPriority().name() : null)
            .status(po.getStatus() != null ? po.getStatus().name() : null)
            .totalGauges(po.getTotalGauges())
            .completedGauges(po.getCompletedGauges())
            .rejectedGauges(po.getRejectedGauges())
            .specialInstructions(po.getSpecialInstructions())
            .createdAt(po.getCreatedAt())
            .updatedAt(po.getUpdatedAt())
            .build());
}

    @Transactional(readOnly = true)
    public PurchaseOrder getPurchaseOrder(UUID poId) {
        return purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", poId));
    }

    @Transactional
    public PurchaseOrder createDraft(UUID factoryId, UUID createdByUserId, PurchaseOrderRequest request) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Factory", "id", factoryId));
        User createdBy = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", createdByUserId));
        Customer customer = customerService.findOrCreateByName(factoryId, request.getCustomerName());

        PurchaseOrder po = PurchaseOrder.builder()
                .factory(factory)
                .poNumber(request.getPoNumber())
                .customer(customer)
                .orderDate(request.getOrderDate())
                .expectedDeliveryDate(request.getExpectedDeliveryDate())
                .priority(request.getPriority() != null ? PriorityLevel.valueOf(request.getPriority()) : PriorityLevel.NORMAL)
                .status(PoStatus.DRAFT)
                .specialInstructions(request.getSpecialInstructions())
                .createdBy(createdBy)
                .build();

        po = purchaseOrderRepository.save(po);

        if (request.getLineItems() != null) {
            for (PurchaseOrderRequest.LineItemRequest liReq : request.getLineItems()) {
                GaugeMaster gm = gaugeMasterRepository.findById(liReq.getGaugeMasterId())
                        .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", liReq.getGaugeMasterId()));

                PoLineItem lineItem = PoLineItem.builder()
                        .purchaseOrder(po)
                        .gaugeMaster(gm)
                        .nominalSize(liReq.getNominalSize())
                        .sizeUnit(liReq.getSizeUnit() != null ? liReq.getSizeUnit() : "mm")
                        .quantity(liReq.getQuantity())
                        .materialGradeOverride(liReq.getMaterialGradeOverride())
                        .lineNotes(liReq.getLineNotes())
                        .build();

                lineItem = poLineItemRepository.save(lineItem);

                // Save custom operation overrides if provided
                if (liReq.getOperations() != null && !liReq.getOperations().isEmpty()) {
                    for (PurchaseOrderRequest.OperationOverride opOverride : liReq.getOperations()) {
                        OperationMaster om = operationMasterRepository.findById(opOverride.getOperationMasterId())
                                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", opOverride.getOperationMasterId()));
                        PoLineItemOperation plio = PoLineItemOperation.builder()
                                .poLineItem(lineItem)
                                .operationMaster(om)
                                .sequenceOrder(opOverride.getSequenceOrder())
                                .isMandatory(opOverride.getIsMandatory() != null ? opOverride.getIsMandatory() : true)
                                .build();
                        lineItem.getOperations().add(plio);
                    }
                    poLineItemRepository.save(lineItem);
                }

                po.getLineItems().add(lineItem);
            }
        }

        log.info("Created draft PO: {} for factory: {}", po.getPoNumber(), factoryId);
        return po;
    }

    @Transactional
    @Auditable(entityType = "PURCHASE_ORDER", action = "CONFIRM")
    public PurchaseOrder confirmPO(UUID poId, UUID confirmedByUserId) {
        PurchaseOrder po = getPurchaseOrder(poId);

        if (po.getStatus() != PoStatus.DRAFT) {
            throw new BusinessException("PO can only be confirmed from DRAFT status", "INVALID_STATUS");
        }

        User confirmedBy = userRepository.findById(confirmedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", confirmedByUserId));

        Factory factory = po.getFactory();
        String factoryCode = factory.getCode();
        int year = LocalDate.now().getYear();

        AtomicInteger globalSeq = new AtomicInteger(1);
        int totalGauges = 0;

        List<PoLineItem> lineItems = poLineItemRepository.findByPurchaseOrderId(poId);

        for (PoLineItem lineItem : lineItems) {
            GaugeMaster gm = lineItem.getGaugeMaster();

            // Determine operation sequence: custom (po_line_item_operations) or default (gauge_master_operations)
            List<OperationSequenceEntry> opSequence = getOperationSequence(lineItem, gm);

            String serialNumber = String.format("%s-%d-%s-BATCH-%03d",
                    factoryCode, year, po.getPoNumber(), globalSeq.getAndIncrement());

            Gauge gauge = Gauge.builder()
                    .factory(factory)
                    .serialNumber(serialNumber)
                    .purchaseOrder(po)
                    .poLineItem(lineItem)
                    .gaugeMaster(gm)
                    .gaugeTypeName(gm.getGaugeTypeName())
                    .nominalSize(lineItem.getNominalSize())
                    .sizeUnit(lineItem.getSizeUnit())
                    .materialGrade(lineItem.getMaterialGradeOverride() != null ?
                            lineItem.getMaterialGradeOverride() : gm.getDefaultMaterialGrade())
                    .batchQuantity(lineItem.getQuantity())
                    .status(GaugeStatus.PENDING)
                    .build();

            gauge = gaugeRepository.save(gauge);

            // Generate QR code
            try {
                String qrPath = qrCodeService.generateAndUploadQrCode(
                        serialNumber, gauge.getId(), po.getPoNumber(), gm.getGaugeTypeName());
                gauge.setQrCodePath(qrPath);
                gauge = gaugeRepository.save(gauge);
            } catch (Exception e) {
                log.warn("QR code generation failed for gauge {}: {}", serialNumber, e.getMessage());
            }

            // Create gauge operations from the sequence
            for (OperationSequenceEntry entry : opSequence) {
                GaugeOperation gaugeOp = GaugeOperation.builder()
                        .gauge(gauge)
                        .operationMaster(entry.operationMaster)
                        .operationName(entry.operationMaster.getOperationName())
                        .sequenceOrder(entry.sequenceOrder)
                        .status(OperationStatus.PENDING)
                        .build();
                gaugeOperationRepository.save(gaugeOp);
            }

            totalGauges++; // We created 1 batch (job card)
        }

        po.setStatus(PoStatus.CONFIRMED);
        po.setTotalGauges(totalGauges);
        po.setConfirmedBy(confirmedBy);
        po.setConfirmedAt(OffsetDateTime.now());
        po = purchaseOrderRepository.save(po);

        // Publish WebSocket event
        // Publish WebSocket event
        eventPublisher.publishPoUpdate(factory.getId(), WebSocketEvent.builder()
                .eventType("PO_CONFIRMED")
                .entityId(po.getId())
                .entityType("PURCHASE_ORDER")
                .title("New Purchase Order")
                .message("PO " + po.getPoNumber() + " confirmed with " + totalGauges + " job cards.")
                .type("info")
                .data(java.util.Map.of(
                        "poNumber", po.getPoNumber(),
                        "totalGauges", totalGauges
                ))
                .build());

        log.info("Confirmed PO: {} with {} job cards generated", po.getPoNumber(), totalGauges);
        return po;
    }

    @Transactional
    public void cancelPO(UUID poId) {
        PurchaseOrder po = getPurchaseOrder(poId);
        if (po.getStatus() != PoStatus.DRAFT) {
            throw new BusinessException("Only DRAFT POs can be cancelled", "INVALID_STATUS");
        }
        po.setStatus(PoStatus.CANCELLED);
        purchaseOrderRepository.save(po);
    }

    @Transactional(readOnly = true)
    public List<Gauge> getPurchaseOrderGauges(UUID poId) {
        return gaugeRepository.findByPurchaseOrderId(poId);
    }

    @Transactional(readOnly = true)
    public List<PoLineItemResponse> getPurchaseOrderLineItems(UUID poId) {
        return poLineItemRepository.findByPurchaseOrderId(poId)
                .stream()
                .map(li -> {
                    PoLineItemResponse.GaugeMasterInfo gmInfo = null;
                    if (li.getGaugeMaster() != null) {
                        // Access inside transaction — Hibernate session is still open here
                        gmInfo = PoLineItemResponse.GaugeMasterInfo.builder()
                                .id(li.getGaugeMaster().getId())
                                .gaugeTypeName(li.getGaugeMaster().getGaugeTypeName())
                                .categoryCode(li.getGaugeMaster().getCategoryCode())
                                .defaultMaterialGrade(li.getGaugeMaster().getDefaultMaterialGrade())
                                .unitOfMeasurement(li.getGaugeMaster().getUnitOfMeasurement())
                                .build();
                    }
                    return PoLineItemResponse.builder()
                            .id(li.getId())
                            .nominalSize(li.getNominalSize())
                            .sizeUnit(li.getSizeUnit())
                            .quantity(li.getQuantity())
                            .materialGradeOverride(li.getMaterialGradeOverride())
                            .lineNotes(li.getLineNotes())
                            .gaugeMaster(gmInfo)
                            .build();
                })
                .collect(Collectors.toList());
    }



    @Transactional
    public PoLineItem addLineItem(UUID poId, PurchaseOrderRequest.LineItemRequest request) {
        PurchaseOrder po = getPurchaseOrder(poId);
        if (po.getStatus() != PoStatus.DRAFT) {
            throw new BusinessException("Line items can only be added to DRAFT POs", "INVALID_STATUS");
        }

        GaugeMaster gm = gaugeMasterRepository.findById(request.getGaugeMasterId())
                .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", request.getGaugeMasterId()));

        PoLineItem lineItem = PoLineItem.builder()
                .purchaseOrder(po)
                .gaugeMaster(gm)
                .nominalSize(request.getNominalSize())
                .sizeUnit(request.getSizeUnit() != null ? request.getSizeUnit() : "mm")
                .quantity(request.getQuantity())
                .materialGradeOverride(request.getMaterialGradeOverride())
                .lineNotes(request.getLineNotes())
                .build();

        lineItem = poLineItemRepository.save(lineItem);
        log.info("Added line item to PO {}: gauge={}, qty={}", po.getPoNumber(), gm.getGaugeTypeName(), request.getQuantity());
        return lineItem;
    }

    @Transactional
    public void deleteLineItem(UUID poId, UUID lineItemId) {
        PurchaseOrder po = getPurchaseOrder(poId);
        if (po.getStatus() != PoStatus.DRAFT) {
            throw new BusinessException("Line items can only be deleted from DRAFT POs", "INVALID_STATUS");
        }
        poLineItemRepository.deleteById(lineItemId);
        log.info("Deleted line item {} from PO {}", lineItemId, po.getPoNumber());
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrder> getPOsDueWithinDays(UUID factoryId, int days) {
        return purchaseOrderRepository.findPOsDueWithinDays(factoryId, days);
    }

    private List<OperationSequenceEntry> getOperationSequence(PoLineItem lineItem, GaugeMaster gm) {
        List<OperationSequenceEntry> entries = new ArrayList<>();

        // Check for custom operations on the line item
        if (lineItem.getOperations() != null && !lineItem.getOperations().isEmpty()) {
            for (PoLineItemOperation plio : lineItem.getOperations()) {
                entries.add(new OperationSequenceEntry(plio.getOperationMaster(), plio.getSequenceOrder()));
            }
        } else {
            // Fall back to gauge master default operations
            List<GaugeMasterOperation> defaults = gaugeMasterService.getDefaultOperationSequenceEntities(gm.getId());
            for (GaugeMasterOperation gmo : defaults) {
                entries.add(new OperationSequenceEntry(gmo.getOperationMaster(), gmo.getSequenceOrder()));
            }
        }

        entries.sort((a, b) -> Integer.compare(a.sequenceOrder, b.sequenceOrder));
        return entries;
    }

    private record OperationSequenceEntry(OperationMaster operationMaster, int sequenceOrder) {}
}
