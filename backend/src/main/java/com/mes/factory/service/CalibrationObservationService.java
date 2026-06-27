package com.mes.factory.service;

import com.mes.factory.entity.postgres.CalibrationObservation;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.PoLineItem;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.exception.BusinessException;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.CalibrationObservationRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.websocket.MesEventPublisher;
import com.mes.factory.websocket.WebSocketEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CalibrationObservationService {

    private static final Logger log = LoggerFactory.getLogger(CalibrationObservationService.class);

    private final CalibrationObservationRepository observationRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final UserRepository userRepository;
    private final GaugeRepository gaugeRepository;
    private final MesEventPublisher eventPublisher;

    public CalibrationObservationService(CalibrationObservationRepository observationRepository,
                                          GaugeOperationRepository gaugeOperationRepository,
                                          UserRepository userRepository,
                                          GaugeRepository gaugeRepository,
                                          MesEventPublisher eventPublisher) {
        this.observationRepository = observationRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.userRepository = userRepository;
        this.gaugeRepository = gaugeRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Initialize observation rows when a calibration operation is started.
     * Creates N rows based on batchQuantity, pre-filling nominal/specified sizes from PoLineItem.
     */
    @Transactional
    public List<CalibrationObservation> initializeObservations(UUID gaugeOperationId) {
        GaugeOperation operation = gaugeOperationRepository.findById(gaugeOperationId)
                .orElseThrow(() -> new ResourceNotFoundException("GaugeOperation", "id", gaugeOperationId));

        // Check if observations already exist
        long existing = observationRepository.countByGaugeOperationId(gaugeOperationId);
        if (existing > 0) {
            log.info("Observations already initialized for operation {}", gaugeOperationId);
            return observationRepository.findByGaugeOperationIdOrderByUnitNumberAsc(gaugeOperationId);
        }

        Gauge gauge = operation.getGauge();
        PoLineItem lineItem = gauge.getPoLineItem();
        int quantity = gauge.getBatchQuantity() != null ? gauge.getBatchQuantity() : 1;

        List<CalibrationObservation> observations = new ArrayList<>();

        for (int i = 1; i <= quantity; i++) {
            CalibrationObservation obs = CalibrationObservation.builder()
                    .gaugeOperation(operation)
                    .gauge(gauge)
                    .unitNumber(i)
                    .result("PENDING")
                    .build();

            // Pre-fill from PoLineItem if available
            if (lineItem != null) {
                obs.setNominalGo(lineItem.getGoSize());
                obs.setNominalNogo(lineItem.getNogoSize());

                // Specified sizes — tol_plus/tol_minus are already absolute upper/lower bounds
                obs.setSpecifiedGoPlus(lineItem.getGoTolPlus());
                obs.setSpecifiedGoMinus(lineItem.getGoTolMinus());
                obs.setSpecifiedNogoPlus(lineItem.getNogoTolPlus());
                obs.setSpecifiedNogoMinus(lineItem.getNogoTolMinus());

                obs.setWearLimit(lineItem.getWearLimit());

                obs.setHigherSize(lineItem.getHigherSize());
                obs.setLowerSize(lineItem.getLowerSize());
            }

            observations.add(obs);
        }

        observations = observationRepository.saveAll(observations);
        log.info("Initialized {} calibration observations for operation {}", quantity, gaugeOperationId);
        return observations;
    }

    /**
     * Get all observations for a calibration operation.
     * Backfills higherSize/lowerSize from PoLineItem if they are null (for pre-existing rows).
     */
    @Transactional
    public List<CalibrationObservation> getObservations(UUID gaugeOperationId) {
        List<CalibrationObservation> observations = observationRepository.findByGaugeOperationIdOrderByUnitNumberAsc(gaugeOperationId);
        
        boolean needsSave = false;
        for (CalibrationObservation obs : observations) {
            if (obs.getHigherSize() == null || obs.getLowerSize() == null) {
                Gauge gauge = obs.getGauge();
                if (gauge != null) {
                    PoLineItem lineItem = gauge.getPoLineItem();
                    if (lineItem != null) {
                        if (obs.getHigherSize() == null && lineItem.getHigherSize() != null) {
                            obs.setHigherSize(lineItem.getHigherSize());
                            needsSave = true;
                        }
                        if (obs.getLowerSize() == null && lineItem.getLowerSize() != null) {
                            obs.setLowerSize(lineItem.getLowerSize());
                            needsSave = true;
                        }
                    }
                }
            }
        }
        
        if (needsSave) {
            observations = observationRepository.saveAll(observations);
            log.info("Backfilled higherSize/lowerSize for operation {}", gaugeOperationId);
        }
        
        return observations;
    }

    /**
     * Get all observations for a gauge (for report generation).
     */
    @Transactional(readOnly = true)
    public List<CalibrationObservation> getObservationsByGauge(UUID gaugeId) {
        return observationRepository.findByGaugeIdOrderByUnitNumberAsc(gaugeId);
    }

    /**
     * Save/update observations with observed readings.
     * Auto-calculates PASS/FAIL based on tolerance bounds.
     */
    @Transactional
    public List<CalibrationObservation> saveObservations(UUID gaugeOperationId, List<Map<String, Object>> observationData, UUID userId) {
        List<CalibrationObservation> existing = observationRepository.findByGaugeOperationIdOrderByUnitNumberAsc(gaugeOperationId);

        if (existing.isEmpty()) {
            throw new BusinessException("No observations found. Start the calibration operation first.", "NO_OBSERVATIONS");
        }

        User worker = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        for (Map<String, Object> entry : observationData) {
            String obsId = (String) entry.get("id");
            if (obsId == null) continue;

            UUID observationId = UUID.fromString(obsId);
            CalibrationObservation obs = existing.stream()
                    .filter(o -> o.getId().equals(observationId))
                    .findFirst()
                    .orElse(null);

            if (obs == null) continue;

            // Parse observed values
            BigDecimal observedGo = parseBigDecimal(entry.get("observedGo"));
            BigDecimal observedNogo = parseBigDecimal(entry.get("observedNogo"));
            String remarks = entry.get("remarks") != null ? entry.get("remarks").toString() : null;

            obs.setObservedGo(observedGo);
            obs.setObservedNogo(observedNogo);
            obs.setRemarks(remarks);
            obs.setRecordedBy(worker);
            obs.setRecordedAt(OffsetDateTime.now());

            // Auto-calculate result
            obs.setResult(calculateResult(obs));
        }

        List<CalibrationObservation> saved = observationRepository.saveAll(existing);

        gaugeOperationRepository.findById(gaugeOperationId).ifPresent(op -> {
            Gauge g = op.getGauge();
            if (g != null) {
                g.setCalibratorName(worker.getFullName());
                g.setCalibratorSign(worker.getSignatureUrl() != null ? worker.getSignatureUrl() : worker.getFullName());
                gaugeRepository.save(g);

                eventPublisher.publishGaugeUpdate(g.getFactory().getId(), WebSocketEvent.builder()
                        .eventType("OBSERVATIONS_UPDATED")
                        .entityId(g.getId())
                        .entityType("GAUGE")
                        .title("Observations Updated")
                        .message("Calibration readings saved for Gauge " + g.getSerialNumber())
                        .type("info")
                        .build());
            }
        });

        return saved;
    }

    /**
     * Calculate PASS/FAIL based on whether observed values fall within specified bounds.
     */
    private String calculateResult(CalibrationObservation obs) {
        if (obs.getObservedGo() == null && obs.getObservedNogo() == null) {
            return "PENDING";
        }

        boolean goOk = true;
        boolean nogoOk = true;

        // Check GO: observed must be within [specifiedGoMinus, specifiedGoPlus]
        if (obs.getObservedGo() != null) {
            if (obs.getSpecifiedGoPlus() != null && obs.getObservedGo().compareTo(obs.getSpecifiedGoPlus()) > 0) {
                goOk = false;
            }
            if (obs.getSpecifiedGoMinus() != null && obs.getObservedGo().compareTo(obs.getSpecifiedGoMinus()) < 0) {
                goOk = false;
            }
        }

        // Check NOGO: observed must be within [specifiedNogoMinus, specifiedNogoPlus]
        if (obs.getObservedNogo() != null) {
            if (obs.getSpecifiedNogoPlus() != null && obs.getObservedNogo().compareTo(obs.getSpecifiedNogoPlus()) > 0) {
                nogoOk = false;
            }
            if (obs.getSpecifiedNogoMinus() != null && obs.getObservedNogo().compareTo(obs.getSpecifiedNogoMinus()) < 0) {
                nogoOk = false;
            }
        }

        return (goOk && nogoOk) ? "PASS" : "FAIL";
    }

    private BigDecimal parseBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return new BigDecimal(value.toString());
        try {
            String str = value.toString().trim();
            if (str.isEmpty()) return null;
            return new BigDecimal(str);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
