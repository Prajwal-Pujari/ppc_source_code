package com.mes.factory.service;

import com.mes.factory.audit.Auditable;
import com.mes.factory.dto.request.PurchaseOrderRequest;
import com.mes.factory.dto.response.PoLineItemOperationResponse;
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
import com.mes.factory.entity.postgres.MachineMaster;
import com.mes.factory.entity.postgres.PoStatus;
import com.mes.factory.entity.postgres.PriorityLevel;
import com.mes.factory.entity.postgres.PurchaseOrder;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.exception.BusinessException;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.ReportConfigurationRepository;
import com.mes.factory.entity.postgres.ReportConfiguration;
import com.mes.factory.repository.postgres.GaugeMasterRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.OperationMasterRepository;
import com.mes.factory.repository.postgres.MachineMasterRepository;
import com.mes.factory.repository.postgres.PoLineItemRepository;
import com.mes.factory.repository.postgres.PurchaseOrderRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.repository.postgres.PqcInspectionLogRepository;
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
    private final ReportConfigurationRepository reportConfigRepo;
    private final MachineMasterRepository machineMasterRepository;
    private final PqcInspectionLogRepository inspectionLogRepository;

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
                                 ReportConfigurationRepository reportConfigRepo,
                                 MachineMasterRepository machineMasterRepository,
                                 PqcInspectionLogRepository inspectionLogRepository,
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
        this.reportConfigRepo = reportConfigRepo;
        this.machineMasterRepository = machineMasterRepository;
        this.inspectionLogRepository = inspectionLogRepository;
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

    return page.map(po -> {
        long produced = inspectionLogRepository.sumProducedByPoId(po.getId());
        long rejected = inspectionLogRepository.sumRejectedByPoId(po.getId());
        long scrapped = inspectionLogRepository.sumScrappedByPoId(po.getId());
        
        String partName = null;
        if (po.getLineItems() != null && !po.getLineItems().isEmpty()) {
            partName = po.getLineItems().stream()
                    .map(li -> li.getGaugeMaster() != null ? li.getGaugeMaster().getGaugeTypeName() : "")
                    .filter(name -> !name.isEmpty())
                    .distinct()
                    .collect(java.util.stream.Collectors.joining(", "));
        }

        return PurchaseOrderResponse.builder()
            .id(po.getId())
            .poNumber(po.getPoNumber())
            .workOrderNo(po.getWorkOrderNo())
            .customerName(po.getCustomer() != null ? po.getCustomer().getName() : null)
            .customerId(po.getCustomer() != null ? po.getCustomer().getId() : null)
            .partName(partName)
            .orderDate(po.getOrderDate())
            .expectedDeliveryDate(po.getExpectedDeliveryDate())
            .priority(po.getPriority() != null ? po.getPriority().name() : null)
            .status(po.getStatus() != null ? po.getStatus().name() : null)
            .totalGauges(po.getTotalGauges())
            .completedGauges(po.getCompletedGauges())
            .rejectedGauges(po.getRejectedGauges())
            .targetQuantity(po.getLineItems() != null ? po.getLineItems().stream().mapToInt(li -> li.getQuantity() != null ? li.getQuantity() : 0).sum() : po.getTotalGauges())
            .producedQuantity((int) produced)
            .rejectedQuantity((int) rejected)
            .scrappedQuantity((int) scrapped)
            .specialInstructions(po.getSpecialInstructions())
            .createdAt(po.getCreatedAt())
            .updatedAt(po.getUpdatedAt())
            .build();
    });
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
                .workOrderNo(request.getWorkOrderNo())
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
                } else {
                    // Copy default operations from GaugeMaster to PoLineItem
                    List<GaugeMasterOperation> defaults = gaugeMasterService.getDefaultOperationSequenceEntities(gm.getId());
                    for (GaugeMasterOperation gmo : defaults) {
                        PoLineItemOperation plio = PoLineItemOperation.builder()
                                .poLineItem(lineItem)
                                .operationMaster(gmo.getOperationMaster())
                                .sequenceOrder(gmo.getSequenceOrder())
                                .isMandatory(gmo.getIsMandatory() != null ? gmo.getIsMandatory() : true)
                                .cycleTimeMins(gmo.getCycleTimeMins())
                                .setupTimeMins(gmo.getSetupTimeMins() != null ? gmo.getSetupTimeMins() : java.math.BigDecimal.ZERO)
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
        ReportConfiguration rc = reportConfigRepo.findByFactoryId(factory.getId()).orElse(null);

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
                    .customerLogo(rc != null ? rc.getCustomerLogo() : null)
                    .docNo(rc != null ? rc.getDocNo() : null)
                    .revNo(rc != null ? rc.getRevNo() : null)
                    .issueDate(rc != null ? rc.getIssueDate() : null)
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
                        .machineMaster(entry.machineMaster)
                        .cycleTimeMins(entry.cycleTimeMins)
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
                            .operations(li.getOperations() != null ? li.getOperations().stream().map(op -> {
                                PoLineItemOperationResponse.MachineMasterInfo mInfo = null;
                                if (op.getMachineMaster() != null) {
                                    mInfo = PoLineItemOperationResponse.MachineMasterInfo.builder()
                                            .id(op.getMachineMaster().getId())
                                            .machineName(op.getMachineMaster().getMachineName())
                                            .machineCode(op.getMachineMaster().getMachineCode())
                                            .build();
                                }
                                return PoLineItemOperationResponse.builder()
                                        .id(op.getId())
                                        .operationMasterId(op.getOperationMaster().getId())
                                        .operationName(op.getOperationMaster().getOperationName())
                                        .operationCode(op.getOperationMaster().getOperationCode())
                                        .department(op.getOperationMaster().getDepartment())
                                        .sequenceOrder(op.getSequenceOrder())
                                        .isMandatory(op.getIsMandatory())
                                        .cycleTimeMins(op.getCycleTimeMins())
                                        .machineMaster(mInfo)
                                        .build();
                            }).collect(Collectors.toList()) : java.util.List.of())
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

        // Copy default operations from GaugeMaster to PoLineItem
        List<GaugeMasterOperation> defaults = gaugeMasterService.getDefaultOperationSequenceEntities(gm.getId());
        for (GaugeMasterOperation gmo : defaults) {
            PoLineItemOperation plio = PoLineItemOperation.builder()
                    .poLineItem(lineItem)
                    .operationMaster(gmo.getOperationMaster())
                    .sequenceOrder(gmo.getSequenceOrder())
                    .isMandatory(gmo.getIsMandatory() != null ? gmo.getIsMandatory() : true)
                    .cycleTimeMins(gmo.getCycleTimeMins())
                    .build();
            lineItem.getOperations().add(plio);
        }
        
        poLineItemRepository.save(lineItem);
        log.info("Added line item to PO {}: gauge={}, qty={}", po.getPoNumber(), gm.getGaugeTypeName(), request.getQuantity());
        return lineItem;
    }

    @Transactional
    public void deleteLineItem(UUID poId, UUID lineItemId) {
        PurchaseOrder po = getPurchaseOrder(poId);
        if (po.getStatus() != PoStatus.DRAFT) {
            throw new BusinessException("Line items can only be deleted from DRAFT POs", "INVALID_STATUS");
        }

        PoLineItem lineItem = poLineItemRepository.findById(lineItemId)
                .orElseThrow(() -> new ResourceNotFoundException("PoLineItem", "id", lineItemId));

        if (!lineItem.getPurchaseOrder().getId().equals(poId)) {
            throw new BusinessException("Line item does not belong to this PO", "INVALID_ASSOCIATION");
        }

        poLineItemRepository.delete(lineItem);
        po.getLineItems().remove(lineItem);
    }
    
    @Transactional
    public PurchaseOrder updatePurchaseOrder(UUID poId, com.mes.factory.dto.request.PurchaseOrderUpdateRequest request) {
        PurchaseOrder po = getPurchaseOrder(poId);
        
        if (request.getWorkOrderNo() != null) {
            po.setWorkOrderNo(request.getWorkOrderNo());
        }
        if (request.getOrderDate() != null) {
            po.setOrderDate(request.getOrderDate());
        }
        if (request.getExpectedDeliveryDate() != null) {
            po.setExpectedDeliveryDate(request.getExpectedDeliveryDate());
        }
        return purchaseOrderRepository.save(po);
    }

    @Transactional
    public com.mes.factory.dto.response.PoLineItemResponse updateLineItem(UUID poId, UUID lineItemId, com.mes.factory.dto.request.LineItemUpdateRequest request) {
        PurchaseOrder po = getPurchaseOrder(poId);
        if (po.getStatus() != PoStatus.DRAFT) {
            throw new BusinessException("Line items can only be updated in DRAFT POs", "INVALID_STATUS");
        }

        PoLineItem lineItem = poLineItemRepository.findById(lineItemId)
                .orElseThrow(() -> new ResourceNotFoundException("PoLineItem", "id", lineItemId));

        if (!lineItem.getPurchaseOrder().getId().equals(poId)) {
            throw new BusinessException("Line item does not belong to this PO", "INVALID_ASSOCIATION");
        }

        if (request.getQuantity() != null) {
            lineItem.setQuantity(request.getQuantity());
        }

        lineItem = poLineItemRepository.save(lineItem);
        
        com.mes.factory.dto.response.PoLineItemResponse.GaugeMasterInfo gmInfo = null;
        if (lineItem.getGaugeMaster() != null) {
            gmInfo = com.mes.factory.dto.response.PoLineItemResponse.GaugeMasterInfo.builder()
                    .id(lineItem.getGaugeMaster().getId())
                    .gaugeTypeName(lineItem.getGaugeMaster().getGaugeTypeName())
                    .categoryCode(lineItem.getGaugeMaster().getCategoryCode())
                    .defaultMaterialGrade(lineItem.getGaugeMaster().getDefaultMaterialGrade())
                    .unitOfMeasurement(lineItem.getGaugeMaster().getUnitOfMeasurement())
                    .build();
        }

        return com.mes.factory.dto.response.PoLineItemResponse.builder()
                .id(lineItem.getId())
                .nominalSize(lineItem.getNominalSize())
                .sizeUnit(lineItem.getSizeUnit())
                .quantity(lineItem.getQuantity())
                .materialGradeOverride(lineItem.getMaterialGradeOverride())
                .lineNotes(lineItem.getLineNotes())
                .gaugeMaster(gmInfo)
                .operations(lineItem.getOperations() != null ? lineItem.getOperations().stream().map(op -> {
                    com.mes.factory.dto.response.PoLineItemOperationResponse.MachineMasterInfo mInfo = null;
                    if (op.getMachineMaster() != null) {
                        mInfo = com.mes.factory.dto.response.PoLineItemOperationResponse.MachineMasterInfo.builder()
                                .id(op.getMachineMaster().getId())
                                .machineName(op.getMachineMaster().getMachineName())
                                .machineCode(op.getMachineMaster().getMachineCode())
                                .build();
                    }
                    return com.mes.factory.dto.response.PoLineItemOperationResponse.builder()
                            .id(op.getId())
                            .operationMasterId(op.getOperationMaster().getId())
                            .operationName(op.getOperationMaster().getOperationName())
                            .operationCode(op.getOperationMaster().getOperationCode())
                            .department(op.getOperationMaster().getDepartment())
                            .sequenceOrder(op.getSequenceOrder())
                            .isMandatory(op.getIsMandatory())
                            .cycleTimeMins(op.getCycleTimeMins())
                            .machineMaster(mInfo)
                            .build();
                }).collect(java.util.stream.Collectors.toList()) : java.util.List.of())
                .build();
    }
    
    @Transactional
    public PoLineItemOperationResponse updateLineItemOperation(UUID poId, UUID lineItemId, UUID opId, UUID machineId, java.math.BigDecimal cycleTimeMins) {
        PurchaseOrder po = getPurchaseOrder(poId);
        // Removed DRAFT check to allow changing machine assignments even if the PO is running
        
        PoLineItem lineItem = poLineItemRepository.findById(lineItemId)
                .orElseThrow(() -> new ResourceNotFoundException("PoLineItem", "id", lineItemId));
        
        PoLineItemOperation operation = lineItem.getOperations().stream()
                .filter(op -> op.getId().equals(opId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("PoLineItemOperation", "id", opId));
                
        if (machineId != null) {
            MachineMaster machine = machineMasterRepository.findById(machineId)
                    .orElseThrow(() -> new ResourceNotFoundException("MachineMaster", "id", machineId));
            operation.setMachineMaster(machine);
        } else {
            operation.setMachineMaster(null);
        }
        
        if (cycleTimeMins != null) {
            operation.setCycleTimeMins(cycleTimeMins);
        }
        
        poLineItemRepository.save(lineItem);
        
        // Also update any generated GaugeOperations
        if (!lineItem.getGauges().isEmpty()) {
            for (Gauge gauge : lineItem.getGauges()) {
                List<GaugeOperation> gaugeOps = gaugeOperationRepository.findByGaugeIdOrderBySequenceOrder(gauge.getId());
                for (GaugeOperation go : gaugeOps) {
                    if (go.getOperationMaster().getId().equals(operation.getOperationMaster().getId())) {
                        go.setMachineMaster(operation.getMachineMaster());
                        gaugeOperationRepository.save(go);
                    }
                }
            }
        }
        
        PoLineItemOperationResponse.MachineMasterInfo mInfo = null;
        if (operation.getMachineMaster() != null) {
            mInfo = PoLineItemOperationResponse.MachineMasterInfo.builder()
                    .id(operation.getMachineMaster().getId())
                    .machineName(operation.getMachineMaster().getMachineName())
                    .machineCode(operation.getMachineMaster().getMachineCode())
                    .build();
        }
        
        return PoLineItemOperationResponse.builder()
                .id(operation.getId())
                .operationMasterId(operation.getOperationMaster().getId())
                .operationName(operation.getOperationMaster().getOperationName())
                .operationCode(operation.getOperationMaster().getOperationCode())
                .department(operation.getOperationMaster().getDepartment())
                .sequenceOrder(operation.getSequenceOrder())
                .isMandatory(operation.getIsMandatory())
                .cycleTimeMins(operation.getCycleTimeMins())
                .machineMaster(mInfo)
                .build();
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
                entries.add(new OperationSequenceEntry(plio.getOperationMaster(), plio.getSequenceOrder(), plio.getMachineMaster(), plio.getCycleTimeMins()));
            }
        } else {
            // Fall back to gauge master default operations
            List<GaugeMasterOperation> defaults = gaugeMasterService.getDefaultOperationSequenceEntities(gm.getId());
            for (GaugeMasterOperation gmo : defaults) {
                entries.add(new OperationSequenceEntry(gmo.getOperationMaster(), gmo.getSequenceOrder(), null, gmo.getCycleTimeMins()));
            }
        }

        entries.sort((a, b) -> Integer.compare(a.sequenceOrder, b.sequenceOrder));
        return entries;
    }

    private record OperationSequenceEntry(OperationMaster operationMaster, int sequenceOrder, com.mes.factory.entity.postgres.MachineMaster machineMaster, java.math.BigDecimal cycleTimeMins) {}
}
