package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.MachineSetupLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MachineSetupLogRepository extends JpaRepository<MachineSetupLog, UUID> {

    @Query("SELECT l FROM MachineSetupLog l WHERE l.poLineItemOperation.id = :poLineItemOperationId ORDER BY l.logTime DESC")
    List<MachineSetupLog> findByPoLineItemOperationId(@Param("poLineItemOperationId") UUID poLineItemOperationId);

    @Query("SELECT l FROM MachineSetupLog l WHERE l.poLineItemOperation.id = :poLineItemOperationId AND l.isPassed = true ORDER BY l.logTime DESC LIMIT 1")
    Optional<MachineSetupLog> findLatestPassedByPoLineItemOperationId(@Param("poLineItemOperationId") UUID poLineItemOperationId);

    @Query("SELECT l FROM MachineSetupLog l WHERE l.poLineItemOperation.poLineItem.id = (SELECT g.poLineItem.id FROM Gauge g WHERE g.id = :gaugeId) ORDER BY l.logTime ASC")
    List<MachineSetupLog> findByGaugeId(@Param("gaugeId") UUID gaugeId);
}
