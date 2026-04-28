package com.mes.factory.service;

import com.mes.factory.dto.request.NcRecordRequest;
import com.mes.factory.entity.postgres.ActionTaken;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.GaugeStatus;
import com.mes.factory.entity.postgres.NcRecord;
import com.mes.factory.entity.postgres.OperationMaster;
import com.mes.factory.entity.postgres.OperationStatus;
import com.mes.factory.entity.postgres.PurchaseOrder;
import com.mes.factory.entity.postgres.RejectionCategory;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.NcRecordRepository;
import com.mes.factory.repository.postgres.OperationMasterRepository;
import com.mes.factory.repository.postgres.PurchaseOrderRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.websocket.MesEventPublisher;
import com.mes.factory.websocket.WebSocketEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class NcRecordService {

    private static final Logger log = LoggerFactory.getLogger(NcRecordService.class);

    private final NcRecordRepository ncRecordRepository;
    private final GaugeRepository gaugeRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final UserRepository userRepository;
    private final MesEventPublisher eventPublisher;

    public NcRecordService(NcRecordRepository ncRecordRepository,
                            GaugeRepository gaugeRepository,
                            GaugeOperationRepository gaugeOperationRepository,
                            OperationMasterRepository operationMasterRepository,
                            PurchaseOrderRepository purchaseOrderRepository,
                            UserRepository userRepository,
                            MesEventPublisher eventPublisher) {
        this.ncRecordRepository = ncRecordRepository;
        this.gaugeRepository = gaugeRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.operationMasterRepository = operationMasterRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public NcRecord createNcRecord(NcRecordRequest request, UUID initiatedByUserId) {
        Gauge gauge = gaugeRepository.findById(request.getGaugeId())
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", request.getGaugeId()));
        GaugeOperation gaugeOperation = gaugeOperationRepository.findById(request.getGaugeOperationId())
                .orElseThrow(() -> new ResourceNotFoundException("GaugeOperation", "id", request.getGaugeOperationId()));
        User initiatedBy = userRepository.findById(initiatedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", initiatedByUserId));

        ActionTaken actionTaken = ActionTaken.valueOf(request.getActionTaken());

        NcRecord ncRecord = NcRecord.builder()
                .gauge(gauge)
                .gaugeOperation(gaugeOperation)
                .rejectionCategory(RejectionCategory.valueOf(request.getRejectionCategory()))
                .rejectionReason(request.getRejectionReason())
                .actionTaken(actionTaken)
                .deviationNote(request.getDeviationNote())
                .rejectedQuantity(request.getRejectedQuantity() != null ? request.getRejectedQuantity() : 1)
                .initiatedBy(initiatedBy)
                .build();

        ncRecord = ncRecordRepository.save(ncRecord);

        switch (actionTaken) {
            case REWORK -> handleRework(gauge, gaugeOperation, request.getReworkOperationIds());
            case SCRAP -> handleScrap(gauge, ncRecord);
            case ACCEPT_WITH_DEVIATION -> handleAcceptWithDeviation(gauge, gaugeOperation);
        }

        log.info("NC record created for gauge {} with action {}", gauge.getSerialNumber(), actionTaken);
        return ncRecord;
    }

    private void handleRework(Gauge gauge, GaugeOperation originalOperation, List<UUID> reworkOperationIds) {
        gauge.setRejectionCount(gauge.getRejectionCount() + 1);

        // Find the max sequence order to append rework ops after
        List<GaugeOperation> existingOps = gaugeOperationRepository.findByGaugeIdOrderBySequenceOrder(gauge.getId());
        int maxSeq = existingOps.stream()
                .mapToInt(GaugeOperation::getSequenceOrder)
                .max()
                .orElse(0);

        AtomicInteger seq = new AtomicInteger(maxSeq + 1);

        if (reworkOperationIds != null && !reworkOperationIds.isEmpty()) {
            for (UUID opMasterId : reworkOperationIds) {
                OperationMaster om = operationMasterRepository.findById(opMasterId)
                        .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", opMasterId));

                GaugeOperation reworkOp = GaugeOperation.builder()
                        .gauge(gauge)
                        .operationMaster(om)
                        .operationName(om.getOperationName() + " (Rework)")
                        .sequenceOrder(seq.getAndIncrement())
                        .status(OperationStatus.QUEUED)
                        .reworkOf(originalOperation)
                        .build();
                gaugeOperationRepository.save(reworkOp);
            }
        }

        gauge.setStatus(GaugeStatus.IN_PRODUCTION);
        gaugeRepository.save(gauge);

        publishNcEvent(gauge, "NC_REWORK");
    }

    private void handleScrap(Gauge gauge, NcRecord ncRecord) {
        int rejectedQty = ncRecord.getRejectedQuantity() != null ? ncRecord.getRejectedQuantity() : 1;
        
        gauge.setBatchQuantity(Math.max(0, gauge.getBatchQuantity() - rejectedQty));
        gauge.setRejectionCount(gauge.getRejectionCount() + rejectedQty);

        if (gauge.getBatchQuantity() <= 0) {
            gauge.setStatus(GaugeStatus.REJECTED);

            // Skip all remaining PENDING and QUEUED operations
            List<GaugeOperation> ops = gaugeOperationRepository.findByGaugeIdOrderBySequenceOrder(gauge.getId());
            for (GaugeOperation op : ops) {
                if (op.getStatus() == OperationStatus.PENDING || op.getStatus() == OperationStatus.QUEUED) {
                    op.setStatus(OperationStatus.SKIPPED);
                    gaugeOperationRepository.save(op);
                }
            }
        }

        gaugeRepository.save(gauge);

        // Increment PO rejected_gauges count
        PurchaseOrder po = gauge.getPurchaseOrder();
        if (po != null) {
            po.setRejectedGauges(po.getRejectedGauges() + rejectedQty);
            purchaseOrderRepository.save(po);
        }

        publishNcEvent(gauge, "NC_SCRAP");
    }

    private void handleAcceptWithDeviation(Gauge gauge, GaugeOperation operation) {
        // Continue normal flow — just mark the operation as completed if in progress
        if (operation.getStatus() == OperationStatus.IN_PROGRESS) {
            operation.setStatus(OperationStatus.COMPLETED);
            operation.setRemarks("Accepted with deviation");
            gaugeOperationRepository.save(operation);
        }
    }

    @Transactional(readOnly = true)
    public List<NcRecord> getGaugeNcRecords(UUID gaugeId) {
        return ncRecordRepository.findByGaugeIdOrderByCreatedAtDesc(gaugeId);
    }

    private void publishNcEvent(Gauge gauge, String eventType) {
        eventPublisher.publishGaugeUpdate(gauge.getFactory().getId(), WebSocketEvent.builder()
                .eventType(eventType)
                .entityId(gauge.getId())
                .entityType("GAUGE")
                .title("NC Record Alert")
                .message("Gauge " + gauge.getSerialNumber() + " was marked as " + eventType.replace("NC_", ""))
                .type("error")
                .data(Map.of(
                        "serialNumber", gauge.getSerialNumber(),
                        "status", gauge.getStatus().name()
                ))
                .build());
    }
}
