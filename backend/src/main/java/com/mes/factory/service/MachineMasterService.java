package com.mes.factory.service;

import com.mes.factory.dto.MachineMasterDto;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.entity.postgres.MachineMaster;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.MachineMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MachineMasterService {

    private final MachineMasterRepository machineMasterRepository;
    private final FactoryRepository factoryRepository;

    @Transactional(readOnly = true)
    public List<MachineMasterDto> getActiveMachines(UUID factoryId) {
        return machineMasterRepository.findByFactoryIdAndIsActiveTrue(factoryId)
                .stream()
                .map(this::mapToDto)
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
                .build();
    }
}
