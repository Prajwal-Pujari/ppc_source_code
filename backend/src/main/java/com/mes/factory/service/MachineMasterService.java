package com.mes.factory.service;

import com.mes.factory.dto.MachineMasterDto;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.entity.postgres.MachineMaster;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.FactoryShiftRepository;
import com.mes.factory.repository.postgres.PoLineItemOperationRepository;
import com.mes.factory.repository.postgres.MachineMasterRepository;
import com.mes.factory.entity.postgres.FactoryShift;
import com.mes.factory.entity.postgres.MachineStatus;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MachineMasterService {

    private final MachineMasterRepository machineMasterRepository;
    private final FactoryRepository factoryRepository;
    private final PoLineItemOperationRepository poLineItemOperationRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final FactoryShiftRepository factoryShiftRepository;

    @Transactional(readOnly = true)
    public List<MachineMasterDto> getActiveMachines(UUID factoryId) {
        // Find machines planned for DRAFT POs
        Set<UUID> plannedMachineIds = new HashSet<>(poLineItemOperationRepository.findPlannedMachineIds());
        // Find machines planned for PENDING/QUEUED/SCHEDULED active operations
        plannedMachineIds.addAll(gaugeOperationRepository.findPlannedMachineIdsForActivePOs(factoryId));
        
        return machineMasterRepository.findByFactoryIdAndIsActiveTrue(factoryId)
                .stream()
                .map(machine -> {
                    MachineMasterDto dto = mapToDto(machine);
                    MachineStatus status = machine.getCurrentStatus() != null ? machine.getCurrentStatus() : MachineStatus.AVAILABLE;
                    
                    if (status == MachineStatus.AVAILABLE && plannedMachineIds.contains(machine.getId())) {
                        dto.setCurrentStatus(MachineStatus.PLANNED.name());
                    } else if (status == MachineStatus.IN_USE) {
                        gaugeOperationRepository.findActiveOperationByMachineId(machine.getId()).ifPresentOrElse(op -> {
                            if (op.getActualStart() != null && op.getCycleTimeMins() != null) {
                                dto.setActiveOperationEndsAt(op.getActualStart().plusMinutes(op.getCycleTimeMins().longValue()));
                            }
                            dto.setActiveOperationName(op.getOperationName());
                            dto.setActiveGaugeSerial(op.getGauge() != null ? op.getGauge().getSerialNumber() : null);
                        }, () -> {
                            // If machine is IN_USE but has no active operation, reset it to AVAILABLE
                            machine.setCurrentStatus(MachineStatus.AVAILABLE);
                            machineMasterRepository.save(machine);
                            dto.setCurrentStatus(MachineStatus.AVAILABLE.name());
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.mes.factory.dto.MachineScheduleEventDto> getMachineScheduleEvents(UUID factoryId) {
        List<FactoryShift> shifts = factoryShiftRepository.findByFactoryIdAndIsActiveTrue(factoryId);
        int totalWorkingMinutesPerDay = 0;
        for (FactoryShift shift : shifts) {
            long shiftMins = java.time.Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes();
            if (shiftMins < 0) {
                shiftMins += 24 * 60; // handle cross-midnight shifts
            }
            int breakMins = shift.getBreakDurationMins() != null ? shift.getBreakDurationMins() : 0;
            totalWorkingMinutesPerDay += Math.max(0, shiftMins - breakMins);
        }

        // Fallback to 8 hours if no shifts are defined or shifts equal 0 mins
        if (totalWorkingMinutesPerDay <= 0) {
            totalWorkingMinutesPerDay = 8 * 60;
        }

        final int workingMins = totalWorkingMinutesPerDay;

        List<com.mes.factory.entity.postgres.GaugeOperation> allGaugeOps = gaugeOperationRepository.findByFactoryAndStatuses(
                factoryId, 
                java.util.Arrays.asList(com.mes.factory.entity.postgres.OperationStatus.values())
        );
        java.util.Map<String, String> gaugeOpStatusMap = new java.util.HashMap<>();
        for (com.mes.factory.entity.postgres.GaugeOperation go : allGaugeOps) {
            if (go.getGauge() != null && go.getGauge().getPoLineItem() != null && go.getOperationMaster() != null) {
                String key = go.getGauge().getPoLineItem().getId() + "-" + go.getOperationMaster().getId();
                // If there are multiple, we only consider it completed if ALL are completed. 
                // But for simplicity and based on current domain, we just take the latest status.
                // Actually, let's only mark it completed if it's COMPLETED, otherwise IN_PROGRESS/PENDING.
                String existing = gaugeOpStatusMap.get(key);
                if (existing == null || !"COMPLETED".equals(go.getStatus().name())) {
                    gaugeOpStatusMap.put(key, go.getStatus().name());
                } else if ("COMPLETED".equals(go.getStatus().name()) && "COMPLETED".equals(existing)) {
                    gaugeOpStatusMap.put(key, "COMPLETED");
                }
            }
        }

        List<com.mes.factory.entity.postgres.PoLineItemOperation> allOps = poLineItemOperationRepository.findAllocatedOperations()
                .stream()
                .filter(op -> op.getMachineMaster() != null && op.getMachineMaster().getFactory().getId().equals(factoryId))
                .collect(Collectors.toList());

        java.util.Map<java.util.UUID, List<com.mes.factory.entity.postgres.PoLineItemOperation>> grouped = allOps.stream()
                .collect(Collectors.groupingBy(op -> op.getPoLineItem().getId()));

        List<com.mes.factory.dto.MachineScheduleEventDto> events = new java.util.ArrayList<>();
        java.time.LocalDate today = java.time.LocalDate.now();

        for (List<com.mes.factory.entity.postgres.PoLineItemOperation> lineItemOps : grouped.values()) {
            lineItemOps.sort(java.util.Comparator.comparing(com.mes.factory.entity.postgres.PoLineItemOperation::getSequenceOrder));
            
            if (lineItemOps.isEmpty()) continue;
            com.mes.factory.entity.postgres.PurchaseOrder po = lineItemOps.get(0).getPoLineItem().getPurchaseOrder();
            boolean isPoCompleted = po.getStatus() != null && 
                ("COMPLETED".equals(po.getStatus().name()) || "CLOSED".equals(po.getStatus().name()));
            
            java.time.LocalDate currentDate = po.getOrderDate() != null ? po.getOrderDate() : today;

            for (com.mes.factory.entity.postgres.PoLineItemOperation op : lineItemOps) {
                int quantity = op.getPoLineItem().getQuantity() != null ? op.getPoLineItem().getQuantity() : 0;
                double cycleTimeMins = op.getCycleTimeMins() != null ? op.getCycleTimeMins().doubleValue() : 0.0;
                double setupMins = op.getSetupTimeMins() != null ? op.getSetupTimeMins().doubleValue() : 0.0;
                double totalOperationMins = (quantity * cycleTimeMins) + setupMins;
                
                int daysNeeded = (int) Math.ceil(totalOperationMins / workingMins);
                
                java.time.LocalDate startDate = currentDate;
                java.time.LocalDate endDate = startDate.plusDays(daysNeeded);
                
                String opKey = op.getPoLineItem().getId() + "-" + op.getOperationMaster().getId();
                String actualStatus = gaugeOpStatusMap.get(opKey);
                
                boolean isOpCompleted = isPoCompleted || "COMPLETED".equals(actualStatus);
                
                if (!"COMPLETED".equals(op.getSetupStatus())) {
                    if (endDate.isBefore(today) || startDate.isBefore(today)) {
                        endDate = today.plusDays(daysNeeded);
                    }
                } else if (op.getSetupCompletedAt() != null) {
                    startDate = op.getSetupCompletedAt().toLocalDate();
                    endDate = startDate.plusDays(daysNeeded);
                    
                    if (!isPoCompleted && !isOpCompleted) {
                        if (endDate.isBefore(today)) {
                            endDate = today;
                        }
                    }
                }
                
                events.add(com.mes.factory.dto.MachineScheduleEventDto.builder()
                        .machineId(op.getMachineMaster().getId())
                        .machineName(op.getMachineMaster().getMachineName())
                        .poNumber(po.getPoNumber())
                        .partName(op.getPoLineItem().getGaugeMaster() != null ? op.getPoLineItem().getGaugeMaster().getGaugeTypeName() : "Unknown")
                        .operationName(op.getOperationMaster().getOperationName())
                        .startDate(startDate)
                        .endDate(endDate)
                        .isCompleted(isOpCompleted)
                        .poStatus(po.getStatus() != null ? po.getStatus().name() : null)
                        .build());
                        
                currentDate = endDate;
            }
        }
        
        try {
            System.out.println("DEBUG SCHEDULE EVENTS: " + new com.fasterxml.jackson.databind.ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(events));
        } catch (Exception e) {}
        
        return events;
    }

    @Transactional
    public MachineMasterDto createMachine(UUID factoryId, MachineMasterDto dto) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new RuntimeException("Factory not found"));

        MachineMaster machine = MachineMaster.builder()
                .factory(factory)
                .machineName(dto.getMachineName())
                .machineCode(dto.getMachineCode())
                .department(dto.getDepartment())
                .isActive(true)
                .build();

        return mapToDto(machineMasterRepository.save(machine));
    }

    @Transactional
    public MachineMasterDto updateMachine(UUID id, MachineMasterDto dto) {
        MachineMaster machine = machineMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        machine.setMachineName(dto.getMachineName());
        machine.setMachineCode(dto.getMachineCode());
        machine.setDepartment(dto.getDepartment());

        return mapToDto(machineMasterRepository.save(machine));
    }

    @Transactional
    public void deleteMachine(UUID id) {
        MachineMaster machine = machineMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Machine not found"));
        machine.setIsActive(false);
        machineMasterRepository.save(machine);
    }

    private MachineMasterDto mapToDto(MachineMaster entity) {
        return MachineMasterDto.builder()
                .id(entity.getId())
                .machineName(entity.getMachineName())
                .machineCode(entity.getMachineCode())
                .department(entity.getDepartment())
                .isActive(entity.getIsActive())
                .currentStatus(entity.getCurrentStatus() != null ? entity.getCurrentStatus().name() : null)
                .build();
    }
}
