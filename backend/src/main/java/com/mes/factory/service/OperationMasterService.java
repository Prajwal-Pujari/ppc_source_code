package com.mes.factory.service;

import com.mes.factory.entity.postgres.OperationMaster;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.OperationMasterRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class OperationMasterService {

    private static final Logger log = LoggerFactory.getLogger(OperationMasterService.class);

    private final OperationMasterRepository operationMasterRepository;
    private final FactoryRepository factoryRepository;

    public OperationMasterService(OperationMasterRepository operationMasterRepository,
                                   FactoryRepository factoryRepository) {
        this.operationMasterRepository = operationMasterRepository;
        this.factoryRepository = factoryRepository;
    }

    @Transactional(readOnly = true)
    public Page<OperationMaster> getOperations(UUID factoryId, Pageable pageable) {
        return operationMasterRepository.findByFactoryIdAndIsActiveTrue(factoryId, pageable);
    }

    @Transactional(readOnly = true)
    public OperationMaster getOperation(UUID id) {
        return operationMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", id));
    }

    @Transactional
    public OperationMaster createOperation(UUID factoryId, OperationMaster operation) {
        operation.setFactory(factoryRepository.findById(factoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Factory", "id", factoryId)));
        return operationMasterRepository.save(operation);
    }

    @Transactional
    public OperationMaster updateOperation(UUID id, OperationMaster updates) {
        OperationMaster existing = getOperation(id);
        existing.setOperationName(updates.getOperationName());
        existing.setOperationCode(updates.getOperationCode());
        existing.setDepartment(updates.getDepartment());
        existing.setStandardTimeHours(updates.getStandardTimeHours());
        existing.setSkillLevel(updates.getSkillLevel());
        existing.setInstructions(updates.getInstructions());
        existing.setIsOutsourced(updates.getIsOutsourced());
        existing.setIsCalibration(updates.getIsCalibration());
        return operationMasterRepository.save(existing);
    }

    @Transactional
    public void deleteOperation(UUID id) {
        OperationMaster om = getOperation(id);
        om.setIsActive(false);
        operationMasterRepository.save(om);
    }
}
