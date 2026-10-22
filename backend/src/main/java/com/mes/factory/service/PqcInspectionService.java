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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class PqcInspectionService {

    private static final Logger log = LoggerFactory.getLogger(PqcInspectionService.class);

    private final PqcInspectionLogRepository inspectionLogRepository;
    private final PqcInspectionPlanRepository inspectionPlanRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final FactoryShiftRepository factoryShiftRepository;
    private final MachineMasterRepository machineMasterRepository;
    private final UserRepository userRepository;
    private final MesEventPublisher eventPublisher;
    private final NcRecordRepository ncRecordRepository;
    private final ReportConfigurationRepository reportConfigurationRepository;
    private final FactoryRepository factoryRepository;

    public PqcInspectionService(PqcInspectionLogRepository inspectionLogRepository,
                                PqcInspectionPlanRepository inspectionPlanRepository,
                                GaugeOperationRepository gaugeOperationRepository,
                                FactoryShiftRepository factoryShiftRepository,
                                MachineMasterRepository machineMasterRepository,
                                UserRepository userRepository,
                                MesEventPublisher eventPublisher,
                                NcRecordRepository ncRecordRepository,
                                ReportConfigurationRepository reportConfigurationRepository,
                                FactoryRepository factoryRepository) {
        this.inspectionLogRepository = inspectionLogRepository;
        this.inspectionPlanRepository = inspectionPlanRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.factoryShiftRepository = factoryShiftRepository;
        this.machineMasterRepository = machineMasterRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.ncRecordRepository = ncRecordRepository;
        this.reportConfigurationRepository = reportConfigurationRepository;
        this.factoryRepository = factoryRepository;
    }

    public static class ShiftWindow {
        private final OffsetDateTime startTime;
        private final OffsetDateTime endTime;

        public ShiftWindow(OffsetDateTime startTime, OffsetDateTime endTime) {
            this.startTime = startTime;
            this.endTime = endTime;
        }

        public OffsetDateTime getStartTime() {
            return startTime;
        }

        public OffsetDateTime getEndTime() {
            return endTime;
        }
    }

    public ZoneId getFactoryZone(UUID factoryId) {
        if (factoryId != null) {
            try {
                Optional<Factory> fOpt = factoryRepository.findById(factoryId);
                if (fOpt.isPresent() && fOpt.get().getTimezone() != null && !fOpt.get().getTimezone().isBlank()) {
                    return ZoneId.of(fOpt.get().getTimezone().trim());
                }
            } catch (Exception e) {
                log.warn("Could not resolve factory timezone: {}", e.getMessage());
            }
        }
        return ZoneId.of("Asia/Kolkata");
    }

    public ZoneId getShiftZone(FactoryShift shift) {
        if (shift != null) {
            if (shift.getFactory() != null) {
                try {
                    if (shift.getFactory().getTimezone() != null && !shift.getFactory().getTimezone().isBlank()) {
                        return ZoneId.of(shift.getFactory().getTimezone().trim());
                    }
                    if (shift.getFactory().getId() != null) {
                        return getFactoryZone(shift.getFactory().getId());
                    }
                } catch (Exception e) {
                    log.warn("Could not resolve shift timezone: {}", e.getMessage());
                }
            }
        }
        return ZoneId.of("Asia/Kolkata");
    }

    /**
     * Compute the bounded start and end timestamps for a factory shift on a given date.
     */
    public ShiftWindow computeShiftWindow(FactoryShift shift, LocalDate referenceDate) {
        ZoneId zone = getShiftZone(shift);
        OffsetDateTime now = OffsetDateTime.now(zone);
        LocalDate targetDate = (referenceDate != null) ? referenceDate : now.toLocalDate();
        LocalTime nowTime = now.toLocalTime();

        if (shift == null || shift.getStartTime() == null || shift.getEndTime() == null) {
            OffsetDateTime start = targetDate.atStartOfDay(zone).toOffsetDateTime();
            OffsetDateTime end = targetDate.plusDays(1).atStartOfDay(zone).toOffsetDateTime();
            return new ShiftWindow(start, end);
        }

        LocalTime start = shift.getStartTime();
        LocalTime end = shift.getEndTime();

        boolean endsAtMidnight = end.equals(LocalTime.MIDNIGHT) || end.equals(LocalTime.MIN);

        if (endsAtMidnight) {
            // Shift starts at 'start' (e.g. 15:01) and ends at midnight (00:00 of the following day)
            OffsetDateTime windowStart = targetDate.atTime(start).atZone(zone).toOffsetDateTime();
            OffsetDateTime windowEnd = targetDate.plusDays(1).atTime(LocalTime.MIDNIGHT).atZone(zone).toOffsetDateTime();
            return new ShiftWindow(windowStart, windowEnd);
        }

        if (start.isBefore(end)) {
            // Normal daytime shift within the same day, e.g. 07:00 - 15:00 or 00:01 - 06:59
            OffsetDateTime windowStart = targetDate.atTime(start).atZone(zone).toOffsetDateTime();
            OffsetDateTime windowEnd = targetDate.atTime(end).atZone(zone).toOffsetDateTime();
            return new ShiftWindow(windowStart, windowEnd);
        } else {
            // Overnight shift crossing midnight, e.g. 22:00 - 06:00
            if (referenceDate == null && nowTime.isBefore(end)) {
                OffsetDateTime windowStart = targetDate.minusDays(1).atTime(start).atZone(zone).toOffsetDateTime();
                OffsetDateTime windowEnd = targetDate.atTime(end).atZone(zone).toOffsetDateTime();
                return new ShiftWindow(windowStart, windowEnd);
            } else {
                OffsetDateTime windowStart = targetDate.atTime(start).atZone(zone).toOffsetDateTime();
                OffsetDateTime windowEnd = targetDate.plusDays(1).atTime(end).atZone(zone).toOffsetDateTime();
                return new ShiftWindow(windowStart, windowEnd);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<FactoryShift> getActiveShifts(UUID factoryId) {
        return factoryShiftRepository.findByFactoryIdAndIsActiveTrue(factoryId);
    }

    public FactoryShift getCurrentShift(UUID factoryId, LocalTime currentTime) {
        if (currentTime == null) {
            ZoneId zone = getFactoryZone(factoryId);
            currentTime = LocalTime.now(zone);
        }
        List<FactoryShift> shifts = getActiveShifts(factoryId);
        for (FactoryShift shift : shifts) {
            LocalTime start = shift.getStartTime();
            LocalTime end = shift.getEndTime();
            boolean endsAtMidnight = end.equals(LocalTime.MIDNIGHT) || end.equals(LocalTime.MIN);

            if (endsAtMidnight) {
                if (!currentTime.isBefore(start)) {
                    return shift;
                }
            } else if (start.isBefore(end)) {
                if (!currentTime.isBefore(start) && currentTime.isBefore(end)) {
                    return shift;
                }
            } else { // Overnight shift crossing midnight
                if (!currentTime.isBefore(start) || currentTime.isBefore(end)) {
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
            ZoneId zone = getFactoryZone(inspector.getFactory().getId());
            shift = getCurrentShift(inspector.getFactory().getId(), LocalTime.now(zone));
        }

        // Determine machine
        MachineMaster machine = null;
        if (request.getMachineId() != null) {
            machine = machineMasterRepository.findById(request.getMachineId()).orElse(null);
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

        // Determine failure and escalation
        boolean isFailed = request.getRejectedQty() > 0 || (request.getScrapQty() != null && request.getScrapQty() > 0) || (request.getReworkQty() != null && request.getReworkQty() > 0);
        String escReason = request.getEscalationReason();
        if (isFailed && (escReason == null || escReason.trim().isEmpty())) {
            escReason = "Quality inspection failure recorded: " + request.getRejectedQty() + " rejected units (" +
                    request.getScrapQty() + " scrap, " + request.getReworkQty() + " rework).";
        }

        // Resolve log time and shift session window
        OffsetDateTime resolvedLogTime;
        if (request.getLogTime() != null) {
            // Explicit timestamp provided (e.g. from custom log time or backfill)
            resolvedLogTime = request.getLogTime();
        } else {
            // LIVE ENTRY ("from now, not the corresponding hour of the shift"):
            resolvedLogTime = OffsetDateTime.now();
        }

        // Verify authority for Previous Entry or custom timestamp modification
        if (Boolean.TRUE.equals(request.getIsBackfill()) || request.getLogTime() != null) {
            boolean hasAuthority = inspector.getRole() == UserRole.ADMIN || Boolean.TRUE.equals(inspector.getCanBackfillPqc());
            if (!hasAuthority) {
                throw new BusinessException("User does not have authority for Previous Entry mode or timestamp modification", "AUTHORITY_REQUIRED");
            }
        }

        // Resolve shift-specific logs BOUNDED to the active shift session window
        List<PqcInspectionLog> existingShiftLogs;
        if (shift != null) {
            ZoneId zone = getShiftZone(shift);
            LocalDate shiftLocalDate = resolvedLogTime.atZoneSameInstant(zone).toLocalDate();
            ShiftWindow window = computeShiftWindow(shift, shiftLocalDate);
            existingShiftLogs = inspectionLogRepository.findByGaugeOperationIdAndShiftIdAndLogTimeBetweenOrderByLogTimeAsc(
                    operation.getId(), shift.getId(), window.getStartTime(), window.getEndTime());
        } else {
            existingShiftLogs = inspectionLogRepository.findByGaugeOperationIdOrderByLogTimeAsc(operation.getId());
        }

        int targetSlotIndex = (request.getSlotIndex() != null && request.getSlotIndex() > 0)
                ? request.getSlotIndex()
                : (existingShiftLogs.size() + 1);

        if (request.getLogTime() == null && Boolean.TRUE.equals(request.getIsBackfill())) {
            // Only backfills of historical slots without custom timestamp use the scheduled slot time if anchor exists
            if (!existingShiftLogs.isEmpty() && targetSlotIndex > 1) {
                PqcInspectionLog firstLog = existingShiftLogs.get(0);
                OffsetDateTime anchorTime = firstLog.getLogTime();
                double intervalHours = 1.0;
                if (operation.getGauge().getFactory() != null) {
                    Optional<ReportConfiguration> cfgOpt = reportConfigurationRepository.findByFactoryId(operation.getGauge().getFactory().getId());
                    if (cfgOpt.isPresent() && cfgOpt.get().getInspectionIntervalHours() != null && cfgOpt.get().getInspectionIntervalHours() > 0) {
                        intervalHours = cfgOpt.get().getInspectionIntervalHours();
                    }
                }
                long offsetSeconds = (long) ((targetSlotIndex - 1) * intervalHours * 3600);
                resolvedLogTime = anchorTime.plusSeconds(offsetSeconds);
            }
        }

        PqcInspectionLog.PqcInspectionLogBuilder logBuilder = PqcInspectionLog.builder()
                .gaugeOperation(operation)
                .gauge(operation.getGauge())
                .inspectionPlan(plan)
                .inspector(inspector)
                .shift(shift)
                .machine(machine)
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
                .incidentType(request.getIncidentType())
                .incidentDurationMins(request.getIncidentDurationMins())
                .incidentRemarks(request.getIncidentRemarks())
                .slotIndex(targetSlotIndex)
                .isBackfill(request.getIsBackfill() != null ? request.getIsBackfill() : false)
                .logTime(resolvedLogTime)
                .isEscalated(isFailed)
                .escalatedTo(isFailed ? "Quality Head & Production Supervisor" : null)
                .escalationReason(isFailed ? escReason : null);

        PqcInspectionLog inspLog = logBuilder.build();
        inspLog = inspectionLogRepository.save(inspLog);

        // Auto-create NC Record if inspection failed
        if (isFailed) {
            try {
                ActionTaken action = (request.getScrapQty() != null && request.getScrapQty() > 0) ? ActionTaken.SCRAP : ActionTaken.REWORK;
                NcRecord nc = NcRecord.builder()
                        .gauge(operation.getGauge())
                        .gaugeOperation(operation)
                        .rejectionCategory(RejectionCategory.DIMENSIONAL_ERROR)
                        .rejectionReason(escReason)
                        .actionTaken(action)
                        .rejectedQuantity(request.getRejectedQty() > 0 ? request.getRejectedQty() : 1)
                        .deviationNote("Auto-escalated from PQC Hourly Inspection (Slot #" + (request.getSlotIndex() != null ? request.getSlotIndex() : "") + ")")
                        .initiatedBy(inspector)
                        .build();
                ncRecordRepository.save(nc);
                log.info("Auto-created NC Record for failed inspection on operation {}", operation.getOperationName());
            } catch (Exception e) {
                log.error("Failed to auto-create NC record: {}", e.getMessage());
            }
        }

        // ── AUTO-COMPLETE: if total passed qty >= planned qty, complete the operation ──
        boolean autoCompleted = false;
        int totalPassed = inspectionLogRepository.sumPassedQtyByOperationId(operation.getId());
        int plannedQty = operation.getGauge().getBatchQuantity();
        if (totalPassed >= plannedQty && operation.getStatus() == OperationStatus.IN_PROGRESS) {
            operation.setStatus(OperationStatus.COMPLETED);
            operation.setCompletedBy(inspector);
            operation.setActualEnd(java.time.OffsetDateTime.now());
            operation.setRemarks((operation.getRemarks() != null ? operation.getRemarks() + " | " : "") +
                    "Auto-completed: " + totalPassed + "/" + plannedQty + " passed via PQC inspection");
            gaugeOperationRepository.save(operation);
            autoCompleted = true;
            log.info("Operation {} auto-completed: {}/{} passed", operation.getOperationName(), totalPassed, plannedQty);

            // Check if all operations on this gauge are done → update gauge status
            long remaining = gaugeOperationRepository.countRemainingByGaugeId(operation.getGauge().getId());
            if (remaining == 0) {
                Gauge gauge = operation.getGauge();
                gauge.setStatus(GaugeStatus.COMPLETED);
            }
        }

        // Publish Event
        if (inspector.getFactory() != null) {
            String eventType = isFailed ? "PQC_INSPECTION_ESCALATED" : (autoCompleted ? "OPERATION_COMPLETED" : "PQC_INSPECTION_LOGGED");
            String message = isFailed 
                    ? "CRITICAL: Operation " + operation.getOperationName() + " logged " + request.getRejectedQty() + " rejected units. Escalated to Quality Head."
                    : (autoCompleted
                        ? "Operation " + operation.getOperationName() + " auto-completed (" + totalPassed + "/" + plannedQty + " passed)"
                        : "Inspector " + inspector.getFullName() + " logged " + request.getActualQty() + " parts for " + operation.getOperationName());

            eventPublisher.publishGaugeUpdate(inspector.getFactory().getId(), WebSocketEvent.builder()
                    .eventType(eventType)
                    .entityId(inspLog.getId())
                    .entityType("PQC_INSPECTION")
                    .title(isFailed ? "CRITICAL: Inspection Failure Escalated" : (autoCompleted ? "Operation Auto-Completed" : "Inspection Logged"))
                    .message(message)
                    .type(isFailed ? "error" : (autoCompleted ? "success" : "success"))
                    .data(Map.of(
                            "operationId", operation.getId().toString(),
                            "gaugeId", operation.getGauge().getId().toString(),
                            "autoCompleted", String.valueOf(autoCompleted),
                            "totalPassed", String.valueOf(totalPassed),
                            "plannedQty", String.valueOf(plannedQty),
                            "isEscalated", String.valueOf(isFailed),
                            "rejectedQty", String.valueOf(request.getRejectedQty())
                    ))
                    .build());
        }

        return inspLog;
    }

    /**
     * Check if passed qty has reached the target and compute hourly interval locking, overdue slots, and shift stack.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getCompletionProgress(UUID operationId) {
        return getCompletionProgress(operationId, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCompletionProgress(UUID operationId, UUID currentShiftId) {
        return getCompletionProgress(operationId, currentShiftId, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCompletionProgress(UUID operationId, UUID currentShiftId, LocalDate shiftDate) {
        GaugeOperation operation = gaugeOperationRepository.findById(operationId)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeOperation", "id", operationId));

        int totalPassed = inspectionLogRepository.sumPassedQtyByOperationId(operationId);
        int totalActual = inspectionLogRepository.sumActualQtyByOperationId(operationId);
        int plannedQty = operation.getGauge().getBatchQuantity() != null ? operation.getGauge().getBatchQuantity() : 0;

        // 1. Fetch Report Configuration for Interval & Shift Duration
        double intervalHours = 1.0;
        double shiftHours = 8.0;
        UUID factoryId = operation.getGauge().getFactory() != null ? operation.getGauge().getFactory().getId() : null;
        if (factoryId != null) {
            Optional<ReportConfiguration> configOpt = reportConfigurationRepository.findByFactoryId(factoryId);
            if (configOpt.isPresent()) {
                ReportConfiguration cfg = configOpt.get();
                if (cfg.getInspectionIntervalHours() != null && cfg.getInspectionIntervalHours() > 0) {
                    intervalHours = cfg.getInspectionIntervalHours();
                }
                if (cfg.getDefaultShiftHours() != null && cfg.getDefaultShiftHours() > 0) {
                    shiftHours = cfg.getDefaultShiftHours();
                }
            }
        }

        // If currentShiftId not provided, default to the currently active shift based on time, or latest shift
        if (currentShiftId == null) {
            if (operation.getGauge().getFactory() != null) {
                ZoneId zone = getFactoryZone(operation.getGauge().getFactory().getId());
                FactoryShift currentFs = getCurrentShift(operation.getGauge().getFactory().getId(), LocalTime.now(zone));
                if (currentFs != null) {
                    currentShiftId = currentFs.getId();
                }
            }
            if (currentShiftId == null) {
                List<PqcInspectionLog> existing = inspectionLogRepository.findByGaugeOperationIdOrderByLogTimeAsc(operationId);
                if (!existing.isEmpty() && existing.get(existing.size() - 1).getShift() != null) {
                    currentShiftId = existing.get(existing.size() - 1).getShift().getId();
                }
            }
        }

        // Look up shift settings from factory_shifts if currentShiftId provided
        String shiftName = null;
        FactoryShift activeShift = null;
        if (currentShiftId != null) {
            Optional<FactoryShift> shiftOpt = factoryShiftRepository.findById(currentShiftId);
            if (shiftOpt.isPresent()) {
                activeShift = shiftOpt.get();
                shiftName = activeShift.getShiftName();
                if (activeShift.getStartTime() != null && activeShift.getEndTime() != null) {
                    long durationMins;
                    if (activeShift.getEndTime().isAfter(activeShift.getStartTime())) {
                        durationMins = java.time.Duration.between(activeShift.getStartTime(), activeShift.getEndTime()).toMinutes();
                    } else {
                        durationMins = java.time.Duration.between(activeShift.getStartTime(), LocalTime.MAX).toMinutes() + 1
                                + java.time.Duration.between(LocalTime.MIN, activeShift.getEndTime()).toMinutes();
                    }
                    if (activeShift.getBreakDurationMins() != null && activeShift.getBreakDurationMins() > 0) {
                        durationMins = Math.max(60, durationMins - activeShift.getBreakDurationMins());
                    }
                    double computedHours = Math.round((durationMins / 60.0) * 10.0) / 10.0;
                    if (computedHours > 0) {
                        shiftHours = computedHours;
                    }
                }
            }
        }
        int maxSlots = Math.max(1, (int) Math.round(shiftHours / intervalHours));

        // 2. Fetch logged inspections - SHIFT-WISE AND BOUNDED TO SHIFT SESSION:
        // Each shift session maintains its own inspection stack based on factory shift settings and shift date
        ZoneId shiftZone = (activeShift != null) ? getShiftZone(activeShift) : getFactoryZone(factoryId);
        LocalDate effectiveShiftDate = (shiftDate != null) ? shiftDate : LocalDate.now(shiftZone);
        List<PqcInspectionLog> logs;
        ShiftWindow shiftWindow = null;
        if (activeShift != null) {
            shiftWindow = computeShiftWindow(activeShift, effectiveShiftDate);
            logs = inspectionLogRepository.findByGaugeOperationIdAndShiftIdAndLogTimeBetweenOrderByLogTimeAsc(
                    operationId, activeShift.getId(), shiftWindow.getStartTime(), shiftWindow.getEndTime());
        } else if (currentShiftId != null) {
            logs = inspectionLogRepository.findByGaugeOperationIdAndShiftIdOrderByLogTimeAsc(operationId, currentShiftId);
        } else {
            logs = inspectionLogRepository.findByGaugeOperationIdOrderByLogTimeAsc(operationId);
        }
        // 3. Map logs to their slot indices
        Map<Integer, PqcInspectionLog> slotToLog = new HashMap<>();
        Set<Integer> loggedSlotIndices = new HashSet<>();
        for (int idx = 0; idx < logs.size(); idx++) {
            PqcInspectionLog l = logs.get(idx);
            int slotNum = (l.getSlotIndex() != null && l.getSlotIndex() > 0)
                    ? l.getSlotIndex()
                    : (idx + 1);
            loggedSlotIndices.add(slotNum);
            slotToLog.putIfAbsent(slotNum, l);
        }
        int totalLoggedSlots = loggedSlotIndices.size();

        // 4. Find first unlogged slot index (1 to maxSlots)
        int nextSlotNumber = 1;
        while (loggedSlotIndices.contains(nextSlotNumber) && nextSlotNumber <= maxSlots) {
            nextSlotNumber++;
        }

        // 5. Last inspection details (for audit/header display in active shift)
        List<PqcInspectionLog> allLogs = inspectionLogRepository.findByGaugeOperationIdOrderByLogTimeAsc(operationId);
        PqcInspectionLog globalLastLog = allLogs.isEmpty() ? null : allLogs.get(allLogs.size() - 1);
        PqcInspectionLog shiftLastLog = logs.isEmpty() ? null : logs.get(logs.size() - 1);
        PqcInspectionLog effectiveLastLog = shiftLastLog != null ? shiftLastLog : globalLastLog;
        OffsetDateTime lastInspectionTime = effectiveLastLog != null ? effectiveLastLog.getLogTime() : null;
        String lastInspectorName = effectiveLastLog != null && effectiveLastLog.getInspector() != null ? effectiveLastLog.getInspector().getFullName() : null;
        UUID lastInspectorId = effectiveLastLog != null && effectiveLastLog.getInspector() != null ? effectiveLastLog.getInspector().getId() : null;

        // 6. Calculate Anchored Locking & Overdue Status:
        // Anchored to the FIRST entry of the shift (e.g. 15:01 -> 16:01 -> 17:01 -> 18:01 ...)
        // Slot 1 is immediately open at shift start.
        // Subsequent slots unlock at: firstLogTime + (slotNumber - 1) * intervalSeconds
        boolean isLocked = false;
        long secondsUntilUnlock = 0;
        OffsetDateTime unlockTime = null;
        boolean isOverdue = false;
        int missedIntervalCount = 0;

        long intervalSeconds = (long) (intervalHours * 3600);
        OffsetDateTime now = OffsetDateTime.now();

        PqcInspectionLog firstShiftLog = logs.isEmpty() ? null : logs.get(0);
        UUID firstInspectorId = firstShiftLog != null && firstShiftLog.getInspector() != null ? firstShiftLog.getInspector().getId() : null;
        String firstInspectorName = firstShiftLog != null && firstShiftLog.getInspector() != null ? firstShiftLog.getInspector().getFullName() : null;

        if (firstShiftLog != null && nextSlotNumber <= maxSlots) {
            // Hourly slots are anchored strictly to the FIRST inspection of this shift session:
            // Slot 1 is immediate, Slot 2 = first + 1h, Slot 3 = first + 2h, Slot 4 = first + 3h...
            // If Slot 2 is entered late (e.g. at 16:55), Slot 3 STILL unlocks at 17:30 (first + 2h), NOT 17:55!
            OffsetDateTime scheduledUnlockTime = firstShiftLog.getLogTime().plusSeconds((long) (nextSlotNumber - 1) * intervalSeconds);

            if (now.isBefore(scheduledUnlockTime)) {
                // Still inside the locked countdown until the anchored slot hour arrives
                isLocked = true;
                secondsUntilUnlock = Math.max(1, java.time.Duration.between(now, scheduledUnlockTime).getSeconds());
                unlockTime = scheduledUnlockTime;
            } else {
                // Anchored hourly slot time has arrived! Unlocked and ready for inspection
                isLocked = false;
                secondsUntilUnlock = 0;
                unlockTime = scheduledUnlockTime;

                long elapsedSinceScheduled = java.time.Duration.between(scheduledUnlockTime, now).getSeconds();
                if (elapsedSinceScheduled >= intervalSeconds) {
                    isOverdue = true;
                    missedIntervalCount = Math.min((int) (elapsedSinceScheduled / intervalSeconds), maxSlots - totalLoggedSlots);
                }
            }
        }

        // 7. Build Slots List for the Active Shift (1 to maxSlots)
        List<Map<String, Object>> slots = new ArrayList<>();
        for (int i = 1; i <= maxSlots; i++) {
            Map<String, Object> slot = new HashMap<>();
            slot.put("slotNumber", i);
            slot.put("targetHour", i * intervalHours);

            OffsetDateTime slotScheduledTime = (firstShiftLog != null)
                    ? firstShiftLog.getLogTime().plusSeconds((long) (i - 1) * intervalSeconds)
                    : null;
            slot.put("scheduledTime", slotScheduledTime != null ? slotScheduledTime.toString() : null);

            PqcInspectionLog l = slotToLog.get(i);
            if (l != null) {
                slot.put("status", "LOGGED");
                slot.put("logId", l.getId().toString());
                slot.put("logTime", l.getLogTime() != null ? l.getLogTime().toString() : null);
                slot.put("inspectorName", l.getInspector() != null ? l.getInspector().getFullName() : "-");
                slot.put("actualQty", l.getActualQty());
                slot.put("passedQty", l.getPassedQty());
                slot.put("rejectedQty", l.getRejectedQty());
                slot.put("reworkQty", l.getReworkQty());
                slot.put("scrapQty", l.getScrapQty());
                slot.put("isFailed", l.getRejectedQty() > 0 || l.getScrapQty() > 0 || l.getReworkQty() > 0);
                slot.put("isEscalated", l.getIsEscalated() != null && l.getIsEscalated());
                slot.put("escalationReason", l.getEscalationReason());
                slot.put("incidentType", l.getIncidentType());
                slot.put("incidentRemarks", l.getIncidentRemarks());
                slot.put("isBackfill", l.getIsBackfill() != null && l.getIsBackfill());
            } else if (i == nextSlotNumber) {
                if (isOverdue) {
                    slot.put("status", "MISSED");
                } else if (isLocked) {
                    slot.put("status", "LOCKED");
                    slot.put("unlockTime", unlockTime != null ? unlockTime.toString() : null);
                    slot.put("secondsUntilUnlock", secondsUntilUnlock);
                } else {
                    slot.put("status", "ACTIVE");
                }
            } else if (i < nextSlotNumber) {
                slot.put("status", "MISSED");
            } else {
                // Strictly locked because sequential entry is enforced
                slot.put("status", "LOCKED");
                slot.put("unlockTime", slotScheduledTime != null ? slotScheduledTime.toString() : null);
            }
            slots.add(slot);
        }

        // Build Response
        Map<String, Object> result = new HashMap<>();
        result.put("operationId", operationId.toString());
        result.put("operationName", operation.getOperationName());
        result.put("plannedQty", plannedQty);
        result.put("totalPassedQty", totalPassed);
        result.put("totalActualQty", totalActual);
        result.put("readyForCompletion", totalPassed >= plannedQty);
        result.put("inspectionIntervalHours", intervalHours);
        result.put("defaultShiftHours", shiftHours);
        result.put("maxSlots", maxSlots);
        result.put("totalLoggedSlots", totalLoggedSlots);
        result.put("shiftName", shiftName);
        result.put("shiftId", currentShiftId != null ? currentShiftId.toString() : null);
        result.put("shiftDate", effectiveShiftDate.toString());
        result.put("shiftWindowStart", shiftWindow != null ? shiftWindow.getStartTime().toString() : null);
        result.put("shiftWindowEnd", shiftWindow != null ? shiftWindow.getEndTime().toString() : null);
        result.put("isLocked", isLocked);
        result.put("unlockTime", unlockTime != null ? unlockTime.toString() : null);
        result.put("secondsUntilUnlock", secondsUntilUnlock);
        result.put("isOverdue", isOverdue);
        result.put("missedIntervalCount", missedIntervalCount);
        result.put("lastInspectionTime", lastInspectionTime != null ? lastInspectionTime.toString() : null);
        result.put("lastInspectorName", lastInspectorName);
        result.put("lastInspectorId", lastInspectorId != null ? lastInspectorId.toString() : null);
        result.put("firstInspectorName", firstInspectorName);
        result.put("firstInspectorId", firstInspectorId != null ? firstInspectorId.toString() : null);
        result.put("slots", slots);

        return result;
    }
}
