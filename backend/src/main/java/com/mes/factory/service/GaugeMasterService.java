package com.mes.factory.service;

import com.mes.factory.dto.response.GaugeMasterOperationResponse;
import com.mes.factory.dto.response.GaugeMasterResponse;
import com.mes.factory.entity.postgres.GaugeMaster;
import com.mes.factory.entity.postgres.GaugeMasterOperation;
import com.mes.factory.entity.postgres.OperationMaster;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeMasterOperationRepository;
import com.mes.factory.repository.postgres.GaugeMasterRepository;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.OperationMasterRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class GaugeMasterService {

    private static final Logger log = LoggerFactory.getLogger(GaugeMasterService.class);

    private final GaugeMasterRepository gaugeMasterRepository;
    private final GaugeMasterOperationRepository gaugeMasterOperationRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final FactoryRepository factoryRepository;

    public GaugeMasterService(GaugeMasterRepository gaugeMasterRepository,
                               GaugeMasterOperationRepository gaugeMasterOperationRepository,
                               OperationMasterRepository operationMasterRepository,
                               FactoryRepository factoryRepository) {
        this.gaugeMasterRepository = gaugeMasterRepository;
        this.gaugeMasterOperationRepository = gaugeMasterOperationRepository;
        this.operationMasterRepository = operationMasterRepository;
        this.factoryRepository = factoryRepository;
    }

    private GaugeMasterResponse toResponse(GaugeMaster gm) {
        return GaugeMasterResponse.builder()
                .id(gm.getId())
                .gaugeTypeName(gm.getGaugeTypeName())
                .categoryCode(gm.getCategoryCode())
                .defaultMaterialGrade(gm.getDefaultMaterialGrade())
                .unitOfMeasurement(gm.getUnitOfMeasurement())
                .notes(gm.getNotes())
                .isActive(gm.getIsActive())
                .factoryId(gm.getFactory() != null ? gm.getFactory().getId() : null)
                .factoryName(gm.getFactory() != null ? gm.getFactory().getName() : null)
                .build();
    }

    private GaugeMasterOperationResponse toOperationResponse(GaugeMasterOperation gmo) {
        return GaugeMasterOperationResponse.builder()
                .id(gmo.getId())
                .sequenceOrder(gmo.getSequenceOrder())
                .isMandatory(gmo.getIsMandatory())
                .operationMasterId(gmo.getOperationMaster() != null ? gmo.getOperationMaster().getId() : null)
                .operationName(gmo.getOperationMaster() != null ? gmo.getOperationMaster().getOperationName() : null)
                .operationCode(gmo.getOperationMaster() != null ? gmo.getOperationMaster().getOperationCode() : null)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<GaugeMasterResponse> getGaugeMasters(UUID factoryId, Pageable pageable) {
        return gaugeMasterRepository
                .findByFactoryIdAndIsActiveTrue(factoryId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public GaugeMasterResponse getGaugeMaster(UUID id) {
        GaugeMaster gm = gaugeMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", id));
        return toResponse(gm);
    }

    @Transactional
    public GaugeMasterResponse createGaugeMaster(UUID factoryId, GaugeMaster gaugeMaster) {
        gaugeMaster.setFactory(factoryRepository.findById(factoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Factory", "id", factoryId)));
        return toResponse(gaugeMasterRepository.save(gaugeMaster));
    }

    @Transactional
    public GaugeMasterResponse updateGaugeMaster(UUID id, GaugeMaster updates) {
        GaugeMaster existing = gaugeMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", id));
        existing.setGaugeTypeName(updates.getGaugeTypeName());
        existing.setCategoryCode(updates.getCategoryCode());
        existing.setDefaultMaterialGrade(updates.getDefaultMaterialGrade());
        existing.setUnitOfMeasurement(updates.getUnitOfMeasurement());
        existing.setNotes(updates.getNotes());
        return toResponse(gaugeMasterRepository.save(existing));
    }

    @Transactional
    public void deleteGaugeMaster(UUID id) {
        GaugeMaster gm = gaugeMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", id));
        gm.setIsActive(false);
        gaugeMasterRepository.save(gm);
    }

    @Transactional(readOnly = true)
    public List<GaugeMasterOperation> getDefaultOperationSequenceEntities(UUID gaugeMasterId) {
        return gaugeMasterOperationRepository.findByGaugeMasterIdOrderBySequenceOrder(gaugeMasterId);
    }

    @Transactional(readOnly = true)
    public List<GaugeMasterOperationResponse> getDefaultOperationSequence(UUID gaugeMasterId) {
        return gaugeMasterOperationRepository
                .findByGaugeMasterIdOrderBySequenceOrder(gaugeMasterId)
                .stream()
                .map(this::toOperationResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public GaugeMasterOperationResponse addOperation(UUID gaugeMasterId, UUID operationMasterId, Integer sequenceOrder) {
        GaugeMaster gm = gaugeMasterRepository.findById(gaugeMasterId)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", gaugeMasterId));
        OperationMaster om = operationMasterRepository.findById(operationMasterId)
                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", operationMasterId));

        GaugeMasterOperation gmo = GaugeMasterOperation.builder()
                .gaugeMaster(gm)
                .operationMaster(om)
                .sequenceOrder(sequenceOrder)
                .isMandatory(true)
                .build();

        return toOperationResponse(gaugeMasterOperationRepository.save(gmo));
    }

    @Transactional
    public void removeOperation(UUID gaugeMasterId, UUID operationMasterId) {
        gaugeMasterOperationRepository.deleteByGaugeMasterIdAndOperationMasterId(gaugeMasterId, operationMasterId);
    }

    @Transactional
    public void reorderOperations(UUID gaugeMasterId, List<UUID> orderedOperationMasterIds) {
        List<GaugeMasterOperation> existing =
                gaugeMasterOperationRepository.findByGaugeMasterIdOrderBySequenceOrder(gaugeMasterId);

        // ── Phase 1 ───────────────────────────────────────────────────────────
        // Shift every row's sequenceOrder to a safe high range (offset + current)
        // so none of the "real" sequence slots (1, 2, 3 …) are occupied when we
        // write the new values in phase 2.
        // Without this, Postgres rejects the update immediately because the unique
        // constraint on (gauge_master_id, sequence_order) is checked per-statement,
        // not deferred to transaction commit.
        final int OFFSET = 10000;
        for (GaugeMasterOperation gmo : existing) {
            gmo.setSequenceOrder(gmo.getSequenceOrder() + OFFSET);
        }
        gaugeMasterOperationRepository.saveAll(existing);
        gaugeMasterOperationRepository.flush(); // ← force DB write before phase 2

        // ── Phase 2 ───────────────────────────────────────────────────────────
        // Assign the real 1-based sequence numbers in the caller-supplied order.
        AtomicInteger seq = new AtomicInteger(1);
        for (UUID opMasterId : orderedOperationMasterIds) {
            existing.stream()
                    .filter(gmo -> gmo.getOperationMaster().getId().equals(opMasterId))
                    .findFirst()
                    .ifPresent(gmo -> gmo.setSequenceOrder(seq.getAndIncrement()));
        }
        gaugeMasterOperationRepository.saveAll(existing);
        gaugeMasterOperationRepository.flush();
    }
}