package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.OperationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GaugeOperationRepository extends JpaRepository<GaugeOperation, UUID> {

    List<GaugeOperation> findByGaugeIdOrderBySequenceOrder(UUID gaugeId);

    List<GaugeOperation> findByAssignedToIdAndStatusIn(UUID workerId, List<OperationStatus> statuses);

    long countByStatusAndGaugeId(OperationStatus status, UUID gaugeId);

    @Query("SELECT go FROM GaugeOperation go WHERE go.gauge.id = :gaugeId AND go.sequenceOrder > :afterSequence " +
            "AND go.status = 'PENDING' ORDER BY go.sequenceOrder ASC LIMIT 1")
    Optional<GaugeOperation> findNextPendingOperation(@Param("gaugeId") UUID gaugeId,
                                                       @Param("afterSequence") Integer afterSequence);

    @Query("SELECT COUNT(go) FROM GaugeOperation go WHERE go.gauge.id = :gaugeId AND go.status = 'COMPLETED'")
    long countCompletedByGaugeId(@Param("gaugeId") UUID gaugeId);

    @Query("SELECT COUNT(go) FROM GaugeOperation go WHERE go.gauge.id = :gaugeId AND go.status NOT IN ('COMPLETED','SKIPPED')")
    long countRemainingByGaugeId(@Param("gaugeId") UUID gaugeId);

    @Query("SELECT go FROM GaugeOperation go WHERE go.assignedTo.id = :workerId AND go.status IN :statuses " +
            "ORDER BY go.scheduledEnd ASC NULLS LAST")
    List<GaugeOperation> findWorkerTasks(@Param("workerId") UUID workerId,
                                          @Param("statuses") List<OperationStatus> statuses);

    @Query("SELECT COALESCE(SUM(go.gauge.batchQuantity), 0) FROM GaugeOperation go WHERE go.status = 'COMPLETED' " +
            "AND go.actualEnd >= :startOfDay AND go.actualEnd < :endOfDay " +
            "AND go.gauge.factory.id = :factoryId")
    long sumCompletedOperationsBatchQuantityToday(@Param("factoryId") UUID factoryId,
                                       @Param("startOfDay") OffsetDateTime startOfDay,
                                       @Param("endOfDay") OffsetDateTime endOfDay);

    @Query("SELECT COUNT(DISTINCT go.assignedTo.id) FROM GaugeOperation go WHERE go.status = 'IN_PROGRESS' " +
            "AND go.gauge.factory.id = :factoryId")
    long countActiveWorkers(@Param("factoryId") UUID factoryId);

    @Query("SELECT COUNT(go) FROM GaugeOperation go WHERE go.status = 'IN_PROGRESS' " +
            "AND go.gauge.factory.id = :factoryId")
    long countInProgressOperations(@Param("factoryId") UUID factoryId);

    @Query("SELECT COUNT(go) FROM GaugeOperation go WHERE go.status IN ('QUEUED','IN_PROGRESS') " +
            "AND go.scheduledEnd < CURRENT_TIMESTAMP AND go.gauge.factory.id = :factoryId")
    long countOverdueOperations(@Param("factoryId") UUID factoryId);

    @Query("SELECT go FROM GaugeOperation go WHERE go.gauge.factory.id = :factoryId " +
            "AND go.status IN :statuses ORDER BY go.gauge.serialNumber, go.sequenceOrder")
    List<GaugeOperation> findByFactoryAndStatuses(@Param("factoryId") UUID factoryId,
                                                   @Param("statuses") List<OperationStatus> statuses);

    @Query("SELECT go FROM GaugeOperation go " +
           "JOIN FETCH go.gauge g " +
           "JOIN FETCH g.purchaseOrder po " +
           "LEFT JOIN FETCH po.customer c " +
           "LEFT JOIN FETCH g.poLineItem li " +
           "LEFT JOIN FETCH g.gaugeMaster gm " +
           "WHERE go.assignedTo.id = :workerId AND go.status IN :statuses " +
           "ORDER BY g.serialNumber, go.sequenceOrder")
    List<GaugeOperation> findWorkerTasksWithRelations(@Param("workerId") UUID workerId, @Param("statuses") List<OperationStatus> statuses);

    @Query("SELECT go FROM GaugeOperation go " +
           "JOIN FETCH go.gauge g " +
           "JOIN FETCH g.purchaseOrder po " +
           "LEFT JOIN FETCH po.customer c " +
           "LEFT JOIN FETCH g.poLineItem li " +
           "LEFT JOIN FETCH g.gaugeMaster gm " +
           "WHERE g.factory.id = :factoryId " +
           "AND go.status IN :statuses " +
           "AND po.status IN ('CONFIRMED', 'IN_PROGRESS') " +
           "ORDER BY g.serialNumber, go.sequenceOrder")
    List<GaugeOperation> findByFactoryAndStatusesForConfirmedPOs(
            @Param("factoryId") UUID factoryId,
            @Param("statuses") List<OperationStatus> statuses);
}
// End of Repository Interface
