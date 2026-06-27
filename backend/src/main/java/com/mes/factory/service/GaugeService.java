package com.mes.factory.service;

import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.GaugeStatus;
import com.mes.factory.entity.postgres.NcRecord;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.NcRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GaugeService {

    private static final Logger log = LoggerFactory.getLogger(GaugeService.class);

    private final GaugeRepository gaugeRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final NcRecordRepository ncRecordRepository;

    public GaugeService(GaugeRepository gaugeRepository,
                         GaugeOperationRepository gaugeOperationRepository,
                         NcRecordRepository ncRecordRepository) {
        this.gaugeRepository = gaugeRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.ncRecordRepository = ncRecordRepository;
    }

    @Transactional(readOnly = true)
    public Gauge getGauge(UUID gaugeId) {
        return gaugeRepository.findByIdWithCustomer(gaugeId)
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", gaugeId));
    }

    @Transactional(readOnly = true)
    public Page<Gauge> getGauges(UUID factoryId, String status, String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return gaugeRepository.searchBySerialNumberOrType(factoryId, search, pageable);
        }
        if (status != null && !status.isBlank()) {
            return gaugeRepository.findByFactoryIdAndStatus(factoryId, GaugeStatus.valueOf(status), pageable);
        }
        return gaugeRepository.findByFactoryId(factoryId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Gauge> getJobCards(UUID factoryId, String search) {
        if (search != null && !search.isBlank()) {
            return gaugeRepository.searchBySerialNumberOrTypeWithCustomer(factoryId, search);
        }
        return gaugeRepository.findAllByFactoryIdWithCustomer(factoryId);
    }

    @Transactional(readOnly = true)
    public List<GaugeOperation> getGaugeOperations(UUID gaugeId) {
        return gaugeOperationRepository.findByGaugeIdOrderBySequenceOrder(gaugeId);
    }

    @Transactional(readOnly = true)
    public List<NcRecord> getGaugeNcRecords(UUID gaugeId) {
        return ncRecordRepository.findByGaugeIdOrderByCreatedAtDesc(gaugeId);
    }

    @Transactional
    public Gauge updateGauge(UUID gaugeId, Map<String, Object> updates) {
        Gauge gauge = gaugeRepository.findById(gaugeId)
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", gaugeId));
        if (updates.containsKey("customerSrNumber")) {
            gauge.setCustomerSrNumber(updates.get("customerSrNumber") != null ? String.valueOf(updates.get("customerSrNumber")) : null);
        }
        if (updates.containsKey("manufactureNumber")) {
            gauge.setManufactureNumber(updates.get("manufactureNumber") != null ? String.valueOf(updates.get("manufactureNumber")) : null);
        }
        if (updates.containsKey("isCalibrationApproved")) {
            gauge.setIsCalibrationApproved(Boolean.parseBoolean(String.valueOf(updates.get("isCalibrationApproved"))));
        }
        if (updates.containsKey("approvedByAdminName")) {
            gauge.setApprovedByAdminName(updates.get("approvedByAdminName") != null ? String.valueOf(updates.get("approvedByAdminName")) : null);
        }
        if (updates.containsKey("approvedByAdminSign")) {
            gauge.setApprovedByAdminSign(updates.get("approvedByAdminSign") != null ? String.valueOf(updates.get("approvedByAdminSign")) : null);
        }
        if (updates.containsKey("calibratorName")) {
            gauge.setCalibratorName(updates.get("calibratorName") != null ? String.valueOf(updates.get("calibratorName")) : null);
        }
        if (updates.containsKey("calibratorSign")) {
            gauge.setCalibratorSign(updates.get("calibratorSign") != null ? String.valueOf(updates.get("calibratorSign")) : null);
        }
        return gaugeRepository.save(gauge);
    }
}
