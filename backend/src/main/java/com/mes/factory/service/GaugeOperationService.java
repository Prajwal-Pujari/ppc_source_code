package com.mes.factory.service;

import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.GaugeStatus;
import com.mes.factory.entity.postgres.OperationStatus;
import com.mes.factory.entity.postgres.PurchaseOrder;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.exception.BusinessException;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.PurchaseOrderRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.websocket.MesEventPublisher;
import com.mes.factory.websocket.WebSocketEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GaugeOperationService {

    private static final Logger log = LoggerFactory.getLogger(GaugeOperationService.class);

    private final GaugeOperationRepository gaugeOperationRepository;
    private final GaugeRepository gaugeRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final UserRepository userRepository;
    private final MesEventPublisher eventPublisher;
    private final CalibrationObservationService calibrationObservationService;

    public GaugeOperationService(GaugeOperationRepository gaugeOperationRepository,
                                  GaugeRepository gaugeRepository,
                                  PurchaseOrderRepository purchaseOrderRepository,
                                  UserRepository userRepository,
                                  MesEventPublisher eventPublisher,
                                  @Lazy CalibrationObservationService calibrationObservationService) {
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.gaugeRepository = gaugeRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.calibrationObservationService = calibrationObservationService;
    }

    @Transactional
    public GaugeOperation assignOperation(UUID operationId, UUID workerId, UUID assignedByUserId) {
        GaugeOperation operation = findOperation(operationId);
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", workerId));
        User assignedBy = userRepository.findById(assignedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", assignedByUserId));

        operation.setAssignedTo(worker);
        operation.setAssignedBy(assignedBy);
        operation.setAssignedAt(OffsetDateTime.now());

        if (operation.getStatus() == OperationStatus.PENDING) {
            operation.setStatus(OperationStatus.QUEUED);
        }

        operation = gaugeOperationRepository.save(operation);

        // Update gauge status to IN_PRODUCTION if still PENDING
        Gauge gauge = operation.getGauge();
        if (gauge.getStatus() == GaugeStatus.PENDING) {
            gauge.setStatus(GaugeStatus.IN_PRODUCTION);
            gauge.setCurrentOperationId(operation.getId());
            gaugeRepository.save(gauge);
        }

        // Send a personal notification to the assigned worker
        eventPublisher.publishWorkerNotification(workerId, WebSocketEvent.builder()
                .eventType("OPERATION_ASSIGNED")
                .entityId(operationId)
                .entityType("GAUGE_OPERATION")
                .title("New Task Assigned")
                .message("You have been assigned to " + operation.getOperationName() + " for Gauge " + gauge.getSerialNumber())
                .type("info")
                .build());

        publishGaugeUpdate(gauge, "OPERATION_ASSIGNED", operation);

        log.info("Assigned operation {} to worker {}", operationId, workerId);
        return operation;
    }

    @Transactional
    public GaugeOperation startOperation(UUID operationId, UUID workerId) {
        GaugeOperation operation = findOperation(operationId);
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", workerId));

        if (operation.getStatus() != OperationStatus.QUEUED && operation.getStatus() != OperationStatus.PENDING) {
            throw new BusinessException("Operation must be in PENDING or QUEUED status to start", "INVALID_STATUS");
        }

        // Auto-assign if not already assigned
        if (operation.getAssignedTo() == null) {
            operation.setAssignedTo(worker);
            operation.setAssignedBy(worker);
            operation.setAssignedAt(OffsetDateTime.now());
        }

        operation.setStatus(OperationStatus.IN_PROGRESS);
        operation.setActualStart(OffsetDateTime.now());
        operation = gaugeOperationRepository.save(operation);

        // Update gauge current operation
        Gauge gauge = operation.getGauge();
        gauge.setCurrentOperationId(operation.getId());
        gauge.setStatus(GaugeStatus.IN_PRODUCTION);
        gaugeRepository.save(gauge);

        publishGaugeUpdate(gauge, "OPERATION_STARTED", operation);

        // Auto-initialize calibration observations if this is a calibration operation
        if (operation.getOperationMaster() != null && Boolean.TRUE.equals(operation.getOperationMaster().getIsCalibration())) {
            try {
                calibrationObservationService.initializeObservations(operationId);
                log.info("Auto-initialized calibration observations for operation {}", operationId);
            } catch (Exception e) {
                log.error("Failed to auto-initialize calibration observations for operation {}", operationId, e);
            }
        }

        log.info("Started operation {} by worker {}", operationId, workerId);
        return operation;
    }

    @Transactional
    public GaugeOperation completeOperation(UUID operationId, UUID workerId,
                                              String remarks, Map<String, Object> qualityParams) {
        GaugeOperation operation = findOperation(operationId);

        if (operation.getStatus() != OperationStatus.IN_PROGRESS) {
            throw new BusinessException("Operation must be IN_PROGRESS to complete", "INVALID_STATUS");
        }

        operation.setStatus(OperationStatus.COMPLETED);
        operation.setActualEnd(OffsetDateTime.now());
        operation.setRemarks(remarks);
        operation.setQualityParams(qualityParams);
        operation = gaugeOperationRepository.save(operation);

        if ((operation.getOperationMaster() != null && Boolean.TRUE.equals(operation.getOperationMaster().getIsCalibration())) || (operation.getOperationName() != null && operation.getOperationName().toLowerCase().contains("calibrat"))) {
            Gauge g = operation.getGauge();
            User worker = userRepository.findById(workerId).orElse(null);
            if (g != null && worker != null) {
                g.setCalibratorName(worker.getFullName());
                g.setCalibratorSign(worker.getSignatureUrl() != null ? worker.getSignatureUrl() : worker.getFullName());
                gaugeRepository.save(g);
            }
        }

        // Check and queue next operation
        checkAndQueueNextOperation(operation.getGauge().getId(), operation.getSequenceOrder());

        publishGaugeUpdate(operation.getGauge(), "OPERATION_COMPLETED", operation);

        log.info("Completed operation {} by worker {}", operationId, workerId);
        return operation;
    }

    @Transactional
    public void checkAndQueueNextOperation(UUID gaugeId, Integer completedSequenceOrder) {
        Gauge gauge = gaugeRepository.findById(gaugeId)
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", gaugeId));

        // Find next pending operation
        gaugeOperationRepository.findNextPendingOperation(gaugeId, completedSequenceOrder)
                .ifPresentOrElse(nextOp -> {
                    nextOp.setStatus(OperationStatus.QUEUED);
                    gaugeOperationRepository.save(nextOp);
                    gauge.setCurrentOperationId(nextOp.getId());
                    gaugeRepository.save(gauge);
                    log.debug("Queued next operation {} for gauge {}", nextOp.getId(), gaugeId);
                }, () -> {
                    // No more operations — check if all are completed
                    long remaining = gaugeOperationRepository.countRemainingByGaugeId(gaugeId);
                    if (remaining == 0) {
                        gauge.setStatus(GaugeStatus.COMPLETED);
                        gauge.setCurrentOperationId(null);
                        gaugeRepository.save(gauge);

                        // Update PO completed_gauges count
                        PurchaseOrder po = gauge.getPurchaseOrder();
                        if (po != null) {
                            po.setCompletedGauges(po.getCompletedGauges() + 1);
                            // Check if all gauges in PO are done
                            if (po.getCompletedGauges() + po.getRejectedGauges() >= po.getTotalGauges()) {
                                po.setStatus(com.mes.factory.entity.postgres.PoStatus.COMPLETED);
                            } else {
                                po.setStatus(com.mes.factory.entity.postgres.PoStatus.IN_PROGRESS);
                            }
                            purchaseOrderRepository.save(po);
                        }

                        log.info("All operations completed for gauge {}", gauge.getSerialNumber());

                        publishGaugeUpdate(gauge, "GAUGE_COMPLETED", null);
                    }
                });
    }

    @Transactional
    public void flagIssue(UUID operationId, UUID workerId, String issueDescription) {
        GaugeOperation operation = findOperation(operationId);
        Gauge gauge = operation.getGauge();

        // Publish notification to supervisors
        eventPublisher.publishGaugeUpdate(gauge.getFactory().getId(), WebSocketEvent.builder()
                .eventType("ISSUE_FLAGGED")
                .entityId(operationId)
                .entityType("GAUGE_OPERATION")
                .title("Issue Flagged")
                .message("Issue reported on OP " + operation.getOperationName() + " for Gauge " + gauge.getSerialNumber())
                .type("error")
                .data(Map.of(
                        "gaugeSerialNumber", gauge.getSerialNumber(),
                        "operationName", operation.getOperationName(),
                        "workerId", workerId.toString(),
                        "issueDescription", issueDescription
                ))
                .build());

        log.info("Issue flagged on operation {} by worker {}: {}", operationId, workerId, issueDescription);
    }

   @Transactional(readOnly = true)
public List<GaugeOperation> getWorkerTasks(UUID workerId, boolean isCalibration) {
    User worker = userRepository.findById(workerId)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", workerId));
    UUID factoryId = worker.getFactory() != null ? worker.getFactory().getId() : null;
    if (factoryId == null) {
        return gaugeOperationRepository.findWorkerTasksWithRelations(workerId,
                List.of(OperationStatus.QUEUED, OperationStatus.IN_PROGRESS, OperationStatus.COMPLETED), isCalibration);
    }
    // Only show operations from CONFIRMED or IN_PROGRESS POs
    return gaugeOperationRepository.findByFactoryAndStatusesForConfirmedPOs(factoryId,
            List.of(OperationStatus.PENDING, OperationStatus.QUEUED, OperationStatus.IN_PROGRESS, OperationStatus.COMPLETED), isCalibration);
}

    @Transactional(readOnly = true)
public Map<String, Long> getWorkerTaskSummary(UUID workerId, boolean isCalibration) {
    User worker = userRepository.findById(workerId)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", workerId));
    UUID factoryId = worker.getFactory() != null ? worker.getFactory().getId() : null;

    List<GaugeOperation> tasks;
    if (factoryId == null) {
        tasks = gaugeOperationRepository.findWorkerTasksWithRelations(
                workerId, List.of(OperationStatus.QUEUED, OperationStatus.IN_PROGRESS, OperationStatus.COMPLETED), isCalibration);
    } else {
        tasks = gaugeOperationRepository.findByFactoryAndStatusesForConfirmedPOs(factoryId,
                List.of(OperationStatus.PENDING, OperationStatus.QUEUED, 
                        OperationStatus.IN_PROGRESS, OperationStatus.COMPLETED), isCalibration);
    }

    long queued = tasks.stream()
            .filter(t -> t.getStatus() == OperationStatus.QUEUED || t.getStatus() == OperationStatus.PENDING)
            .count();
    long inProgress = tasks.stream().filter(t -> t.getStatus() == OperationStatus.IN_PROGRESS).count();
    long completed = tasks.stream().filter(t -> t.getStatus() == OperationStatus.COMPLETED).count();

    return Map.of("queued", queued, "inProgress", inProgress, "completed", completed);
}

    @Transactional(readOnly = true)
    public List<GaugeOperation> getFactoryOperationsByStatus(UUID factoryId, String statusesCsv) {
        if (statusesCsv == null || statusesCsv.isBlank() || statusesCsv.toUpperCase().contains("ALL")) {
            return gaugeOperationRepository.findAnalyticsOperations(factoryId, List.of(OperationStatus.values()));
        }
        List<OperationStatus> statuses = java.util.Arrays.stream(statusesCsv.split(","))
                .map(String::trim)
                .map(s -> {
                    try { return OperationStatus.valueOf(s); } catch (Exception e) { return null; }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
        if (statuses.isEmpty()) {
            return gaugeOperationRepository.findAnalyticsOperations(factoryId, List.of(OperationStatus.values()));
        }
        return gaugeOperationRepository.findAnalyticsOperations(factoryId, statuses);
    }

    private GaugeOperation findOperation(UUID operationId) {
        return gaugeOperationRepository.findById(operationId)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeOperation", "id", operationId));
    }

    private void publishGaugeUpdate(Gauge gauge, String eventType, GaugeOperation operation) {
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("gaugeId", gauge.getId().toString());
        data.put("serialNumber", gauge.getSerialNumber());
        data.put("status", gauge.getStatus().name());
        if (operation != null) {
            data.put("operationId", operation.getId().toString());
            data.put("operationName", operation.getOperationName());
            data.put("operationStatus", operation.getStatus().name());
        }

        eventPublisher.publishGaugeUpdate(gauge.getFactory().getId(), WebSocketEvent.builder()
                .eventType(eventType)
                .entityId(gauge.getId())
                .entityType("GAUGE")
                .title(eventType.replace("_", " "))
                .message("Gauge " + gauge.getSerialNumber() + " updated" + (operation != null ? " on " + operation.getOperationName() : ""))
                .type(eventType.contains("COMPLETED") ? "success" : "info")
                .data(data)
                .build());
    }
}
