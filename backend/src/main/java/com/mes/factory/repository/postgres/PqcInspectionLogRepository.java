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
    List<PqcInspectionLog> findByGaugeOperationIdOrderByLogTimeAsc(UUID gaugeOperationId);
    @Query("SELECT l FROM PqcInspectionLog l " +
           "JOIN FETCH l.gauge g " +
           "LEFT JOIN FETCH g.purchaseOrder po " +
           "LEFT JOIN FETCH po.customer " +
           "JOIN FETCH l.gaugeOperation go " +
           "LEFT JOIN FETCH l.machine m " +
           "JOIN FETCH l.inspector i " +
           "WHERE g.factory.id = :factoryId AND l.scrapQty > :scrapQty " +
           "ORDER BY l.logTime DESC")
    List<PqcInspectionLog> findScrapLogsWithDetails(@Param("factoryId") UUID factoryId, @Param("scrapQty") Integer scrapQty);

    @Query("SELECT COALESCE(SUM(l.passedQty), 0) FROM PqcInspectionLog l WHERE l.gaugeOperation.id = :operationId")
    int sumPassedQtyByOperationId(UUID operationId);

    @Query("SELECT COALESCE(SUM(l.actualQty), 0) FROM PqcInspectionLog l WHERE l.gaugeOperation.id = :operationId")
    int sumActualQtyByOperationId(UUID operationId);

    // ── PO quantities ──
    @Query(value = "SELECT COALESCE(SUM(l.passed_qty), 0) FROM pqc_inspection_logs l JOIN gauge_operations go ON l.gauge_operation_id = go.id JOIN gauges g ON l.gauge_id = g.id WHERE g.purchase_order_id = cast(:poId as uuid) AND go.sequence_order = (SELECT MAX(sequence_order) FROM gauge_operations WHERE gauge_id = g.id)", nativeQuery = true)
    long sumProducedByPoId(@Param("poId") UUID poId);

    @Query("SELECT COALESCE(SUM(l.rejectedQty), 0) FROM PqcInspectionLog l WHERE l.gauge.purchaseOrder.id = :poId")
    long sumRejectedByPoId(@Param("poId") UUID poId);

    @Query("SELECT COALESCE(SUM(l.scrapQty), 0) FROM PqcInspectionLog l WHERE l.gauge.purchaseOrder.id = :poId")
    long sumScrappedByPoId(@Param("poId") UUID poId);

    // ── Dashboard queries ──

    @Query(value = "SELECT COALESCE(SUM(max_planned), 0) FROM (SELECT MAX(l.planned_qty) as max_planned FROM pqc_inspection_logs l JOIN gauges g ON l.gauge_id = g.id WHERE g.factory_id = cast(:factoryId as uuid) AND l.log_time >= :since GROUP BY l.gauge_id) as sub", nativeQuery = true)
    long sumPlannedSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query(value = "SELECT COALESCE(SUM(max_op_actual), 0) FROM (SELECT MAX(op_actual) as max_op_actual FROM (SELECT l.gauge_id, l.gauge_operation_id, SUM(l.actual_qty) as op_actual FROM pqc_inspection_logs l JOIN gauges g ON l.gauge_id = g.id WHERE g.factory_id = cast(:factoryId as uuid) AND l.log_time >= :since GROUP BY l.gauge_id, l.gauge_operation_id) as op_sums GROUP BY gauge_id) as gauge_max", nativeQuery = true)
    long sumActualSince(@Param("factoryId") UUID factoryId, @Param("since") OffsetDateTime since);

    @Query(value = "SELECT COALESCE(SUM(max_op_passed), 0) FROM (SELECT MAX(op_passed) as max_op_passed FROM (SELECT l.gauge_id, l.gauge_operation_id, SUM(l.passed_qty) as op_passed FROM pqc_inspection_logs l JOIN gauges g ON l.gauge_id = g.id WHERE g.factory_id = cast(:factoryId as uuid) AND l.log_time >= :since GROUP BY l.gauge_id, l.gauge_operation_id) as op_sums GROUP BY gauge_id) as gauge_max", nativeQuery = true)
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
    @Query(value = "SELECT COALESCE(SUM(max_op_actual), 0) FROM (SELECT MAX(op_actual) as max_op_actual FROM (SELECT l.gauge_id, l.gauge_operation_id, SUM(l.actual_qty) as op_actual FROM pqc_inspection_logs l JOIN gauges g ON l.gauge_id = g.id WHERE g.factory_id = cast(:factoryId as uuid) GROUP BY l.gauge_id, l.gauge_operation_id) as op_sums GROUP BY gauge_id) as gauge_max", nativeQuery = true)
    long sumActualAllTime(@Param("factoryId") UUID factoryId);

    @Query(value = "SELECT COALESCE(SUM(max_op_passed), 0) FROM (SELECT MAX(op_passed) as max_op_passed FROM (SELECT l.gauge_id, l.gauge_operation_id, SUM(l.passed_qty) as op_passed FROM pqc_inspection_logs l JOIN gauges g ON l.gauge_id = g.id WHERE g.factory_id = cast(:factoryId as uuid) GROUP BY l.gauge_id, l.gauge_operation_id) as op_sums GROUP BY gauge_id) as gauge_max", nativeQuery = true)
    long sumPassedAllTime(@Param("factoryId") UUID factoryId);

    @Query("SELECT COALESCE(SUM(l.rejectedQty), 0) FROM PqcInspectionLog l " +
           "WHERE l.gauge.factory.id = :factoryId")
    long sumRejectedAllTime(@Param("factoryId") UUID factoryId);
}
