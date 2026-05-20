package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.CalibrationObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CalibrationObservationRepository extends JpaRepository<CalibrationObservation, UUID> {
    long countByGaugeOperationId(UUID gaugeOperationId);
    List<CalibrationObservation> findByGaugeOperationIdOrderByUnitNumberAsc(UUID gaugeOperationId);
    List<CalibrationObservation> findByGaugeIdOrderByUnitNumberAsc(UUID gaugeId);
}
