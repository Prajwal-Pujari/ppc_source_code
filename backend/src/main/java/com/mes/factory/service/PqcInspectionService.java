package com.mes.factory.service;

import com.mes.factory.dto.request.PqcInspectionLogRequest;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.exception.BusinessException;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.*;
import com.mes.factory.websocket.MesEventPublisher;
import com.mes.factory.websocket.WebSocketEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PqcInspectionService {

    private static final Logger log = LoggerFactory.getLogger(PqcInspectionService.class);

    private final PqcInspectionLogRepository inspectionLogRepository;
    private final PqcInspectionPlanRepository inspectionPlanRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final FactoryShiftRepository factoryShiftRepository;
    private final UserRepository userRepository;
    private final MesEventPublisher eventPublisher;

    public PqcInspectionService(PqcInspectionLogRepository inspectionLogRepository,
                                PqcInspectionPlanRepository inspectionPlanRepository,
                                GaugeOperationRepository gaugeOperationRepository,
                                FactoryShiftRepository factoryShiftRepository,
                                UserRepository userRepository,
                                MesEventPublisher eventPublisher) {
        this.inspectionLogRepository = inspectionLogRepository;
        this.inspectionPlanRepository = inspectionPlanRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.factoryShiftRepository = factoryShiftRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<FactoryShift> getActiveShifts(UUID factoryId) {
        return factoryShiftRepository.findByFactoryIdAndIsActiveTrue(factoryId);
    }

    public FactoryShift getCurrentShift(UUID factoryId, LocalTime currentTime) {
        List<FactoryShift> shifts = getActiveShifts(factoryId);
        for (FactoryShift shift : shifts) {
            if (shift.getStartTime().isBefore(shift.getEndTime())) {
                if (!currentTime.isBefore(shift.getStartTime()) && currentTime.isBefore(shift.getEndTime())) {
                    return shift;
                }
            } else { // Overnight shift
                if (!currentTime.isBefore(shift.getStartTime()) || currentTime.isBefore(shift.getEndTime())) {
                    return shift;
                }
            }
        }
        return null;
    }

    @Transactional
    public PqcInspectionLog logInspection(UUID inspectorId, PqcInspectionLogRequest request) {
        User inspector = userRepository.findById(inspectorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", inspectorId));
                
        GaugeOperation operation = gaugeOperationRepository.findById(request.getGaugeOperationId())
                .orElseThrow(() -> new ResourceNotFoundException("GaugeOperation", "id", request.getGaugeOperationId()));

        if (operation.getStatus() != OperationStatus.IN_PROGRESS) {
            throw new BusinessException("Cannot log inspection on an operation that is not IN_PROGRESS", "INVALID_OPERATION_STATUS");
        }

        if (request.getActualQty() != (request.getPassedQty() + request.getRejectedQty())) {
            throw new BusinessException("Actual quantity must equal Passed + Rejected quantities", "INVALID_QUANTITIES");
        }
        
        if (request.getRejectedQty() != (request.getScrapQty() + request.getReworkQty())) {
            throw new BusinessException("Rejected quantity must equal Scrap + Rework quantities", "INVALID_QUANTITIES");
        }

        // Determine shift
        FactoryShift shift = null;
        if (request.getShiftId() != null) {
            shift = factoryShiftRepository.findById(request.getShiftId()).orElse(null);
        }
        if (shift == null && inspector.getFactory() != null) {
            shift = getCurrentShift(inspector.getFactory().getId(), LocalTime.now());
        }

        // Find Plan
        PqcInspectionPlan plan = null;
        try {
            plan = inspectionPlanRepository.findByGaugeMasterIdAndOperationMasterId(
                    operation.getGauge().getPurchaseOrder().getLineItems().get(0).getGaugeMaster().getId(), 
                    operation.getOperationMaster().getId()
            ).orElse(null);
        } catch (Exception e) {
            log.warn("Could not resolve inspection plan: {}", e.getMessage());
        }

        PqcInspectionLog inspLog = PqcInspectionLog.builder()
                .gaugeOperation(operation)
                .gauge(operation.getGauge())
                .inspectionPlan(plan)
                .inspector(inspector)
                .shift(shift)
                .plannedQty(operation.getGauge().getBatchQuantity()) 
                .actualQty(request.getActualQty())
                .passedQty(request.getPassedQty())
                .rejectedQty(request.getRejectedQty())
                .reworkQty(request.getReworkQty())
                .scrapQty(request.getScrapQty())
                .rejectionReasons(request.getRejectionReasons())
                .measurementData(request.getMeasurementData())
                .questionAnswers(request.getQuestionAnswers())
                .remarks(request.getRemarks())
                .build();

        inspLog = inspectionLogRepository.save(inspLog);

        // Publish Event
        if (inspector.getFactory() != null) {
            eventPublisher.publishGaugeUpdate(inspector.getFactory().getId(), WebSocketEvent.builder()
                    .eventType("PQC_INSPECTION_LOGGED")
                    .entityId(inspLog.getId())
                    .entityType("PQC_INSPECTION")
                    .title("Inspection Logged")
                    .message("Inspector " + inspector.getFullName() + " logged " + request.getActualQty() + " parts for " + operation.getOperationName())
                    .type(request.getRejectedQty() > 0 ? "warning" : "success")
                    .data(Map.of(
                            "operationId", operation.getId().toString(),
                            "gaugeId", operation.getGauge().getId().toString()
                    ))
                    .build());
        }

        return inspLog;
    }

    /**
     * Check if passed qty has reached the target for auto-completion.
     * Returns a map with progress data for the frontend confirmation dialog.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getCompletionProgress(UUID operationId) {
        GaugeOperation operation = gaugeOperationRepository.findById(operationId)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeOperation", "id", operationId));

        int totalPassed = inspectionLogRepository.sumPassedQtyByOperationId(operationId);
        int totalActual = inspectionLogRepository.sumActualQtyByOperationId(operationId);
        int plannedQty = operation.getGauge().getBatchQuantity();

        return Map.of(
                "operationId", operationId.toString(),
                "operationName", operation.getOperationName(),
                "plannedQty", plannedQty,
                "totalPassedQty", totalPassed,
                "totalActualQty", totalActual,
                "readyForCompletion", totalPassed >= plannedQty
        );
    }
}
