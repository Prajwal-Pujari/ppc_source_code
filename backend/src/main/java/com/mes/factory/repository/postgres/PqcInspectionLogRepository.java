package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcInspectionLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PqcInspectionLogRepository extends JpaRepository<PqcInspectionLog, UUID> {
    List<PqcInspectionLog> findByGaugeOperationIdOrderByLogTimeDesc(UUID gaugeOperationId);

    @Query("SELECT COALESCE(SUM(l.passedQty), 0) FROM PqcInspectionLog l WHERE l.gaugeOperation.id = :operationId")
    int sumPassedQtyByOperationId(UUID operationId);

    @Query("SELECT COALESCE(SUM(l.actualQty), 0) FROM PqcInspectionLog l WHERE l.gaugeOperation.id = :operationId")
    int sumActualQtyByOperationId(UUID operationId);

    // ── Dashboard queries ──

    @Query("SELECT COALESCE(SUM(l.plannedQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long sumPlannedSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(l.actualQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long sumActualSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(l.passedQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long sumPassedSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(l.rejectedQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long sumRejectedSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(l.reworkQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long sumReworkSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(l.scrapQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long sumScrapSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query("SELECT COUNT(l) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since")
    long countLogsSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    // Recent logs with relations
    @Query("SELECT l FROM PqcInspectionLog l " +
           "LEFT JOIN FETCH l.inspector " +
           "LEFT JOIN FETCH l.gaugeOperation go " +
           "LEFT JOIN FETCH l.gauge g " +
           "WHERE g.factory.id = :factoryId " +
           "ORDER BY l.logTime DESC")
    List<PqcInspectionLog> findRecentByFactory(@Param("factoryId") UUID factoryId, Pageable pageable);

    // All logs since a date (for hourly breakdown)
    @Query("SELECT l FROM PqcInspectionLog l " +
           "LEFT JOIN FETCH l.inspector " +
           "LEFT JOIN FETCH l.gaugeOperation " +
           "WHERE l.gauge.factory.id = :factoryId AND l.logTime >= :since " +
           "ORDER BY l.logTime ASC")
    List<PqcInspectionLog> findAllSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    // All-time totals (for overall stats)
    @Query("SELECT COALESCE(SUM(l.actualQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId")
    long sumActualAllTime(@Param("factoryId") UUID factoryId);

    @Query("SELECT COALESCE(SUM(l.passedQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId")
    long sumPassedAllTime(@Param("factoryId") UUID factoryId);

    @Query("SELECT COALESCE(SUM(l.rejectedQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId")
    long sumRejectedAllTime(@Param("factoryId") UUID factoryId);
}
