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
        Set<UUID> plannedMachineIds = new HashSet<>(poLineItemOperationRepository.findPlannedMachineIds());
        
        return machineMasterRepository.findByFactoryIdAndIsActiveTrue(factoryId)
                .stream()
                .map(machine -> {
                    MachineMasterDto dto = mapToDto(machine);
                    MachineStatus status = machine.getCurrentStatus() != null ? machine.getCurrentStatus() : MachineStatus.AVAILABLE;
                    
                    if (status == MachineStatus.AVAILABLE && plannedMachineIds.contains(machine.getId())) {
                        dto.setCurrentStatus(MachineStatus.PLANNED.name());
                    } else if (status == MachineStatus.IN_USE) {
                        gaugeOperationRepository.findActiveOperationByMachineId(machine.getId()).ifPresent(op -> {
                            if (op.getActualStart() != null && op.getCycleTimeMins() != null) {
                                dto.setActiveOperationEndsAt(op.getActualStart().plusMinutes(op.getCycleTimeMins().longValue()));
                            }
                            dto.setActiveOperationName(op.getOperationName());
                            dto.setActiveGaugeSerial(op.getGauge() != null ? op.getGauge().getSerialNumber() : null);
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

        return poLineItemOperationRepository.findAllocatedOperations().stream()
                .filter(op -> op.getMachineMaster().getFactory().getId().equals(factoryId))
                .map(op -> {
                    com.mes.factory.entity.postgres.PurchaseOrder po = op.getPoLineItem().getPurchaseOrder();
                    
                    int quantity = op.getPoLineItem().getQuantity() != null ? op.getPoLineItem().getQuantity() : 0;
                    double cycleTimeMins = op.getCycleTimeMins() != null ? op.getCycleTimeMins().doubleValue() : 0.0;
                    double totalOperationMins = quantity * cycleTimeMins;
                    
                    int daysNeeded = (int) Math.ceil(totalOperationMins / workingMins);
                    java.time.LocalDate startDate = po.getOrderDate() != null ? po.getOrderDate() : java.time.LocalDate.now();
                    java.time.LocalDate endDate = startDate.plusDays(daysNeeded);
                    
                    return com.mes.factory.dto.MachineScheduleEventDto.builder()
                            .machineId(op.getMachineMaster().getId())
                            .machineName(op.getMachineMaster().getMachineName())
                            .poNumber(po.getPoNumber())
                            .partName(op.getPoLineItem().getGaugeMaster() != null ? op.getPoLineItem().getGaugeMaster().getGaugeTypeName() : "Unknown")
                            .operationName(op.getOperationMaster().getOperationName())
                            .startDate(startDate)
                            .endDate(endDate)
                            .build();
                })
                .collect(Collectors.toList());
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
