package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GaugeRepository extends JpaRepository<Gauge, UUID> {
    @Query("SELECT g FROM Gauge g LEFT JOIN FETCH g.purchaseOrder po LEFT JOIN FETCH po.customer WHERE g.id = :id")
    java.util.Optional<Gauge> findByIdWithCustomer(@Param("id") UUID id);

    List<Gauge> findByPurchaseOrderId(UUID poId);

    Page<Gauge> findByPurchaseOrderId(UUID poId, Pageable pageable);

    Page<Gauge> findByFactoryIdAndStatus(UUID factoryId, GaugeStatus status, Pageable pageable);

    @Query("SELECT COALESCE(SUM(g.batchQuantity), 0) FROM Gauge g WHERE g.factory.id = :factoryId AND g.status = :status")
    Long sumBatchQuantityByFactoryIdAndStatus(@Param("factoryId") UUID factoryId, @Param("status") GaugeStatus status);

    @Query("SELECT g FROM Gauge g LEFT JOIN FETCH g.purchaseOrder po LEFT JOIN FETCH po.customer WHERE g.factory.id = :factoryId")
    List<Gauge> findAllByFactoryIdWithCustomer(@Param("factoryId") UUID factoryId);

    Page<Gauge> findByFactoryId(UUID factoryId, Pageable pageable);

    long countByStatusAndPurchaseOrderId(GaugeStatus status, UUID purchaseOrderId);

    @Query("SELECT g FROM Gauge g LEFT JOIN FETCH g.purchaseOrder po LEFT JOIN FETCH po.customer WHERE g.factory.id = :factoryId AND " +
            "(LOWER(g.serialNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(g.gaugeTypeName) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Gauge> searchBySerialNumberOrTypeWithCustomer(@Param("factoryId") UUID factoryId,
                                           @Param("search") String search);

    @Query("SELECT g FROM Gauge g WHERE g.factory.id = :factoryId AND " +
            "(LOWER(g.serialNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(g.gaugeTypeName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Gauge> searchBySerialNumberOrType(@Param("factoryId") UUID factoryId,
                                           @Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(g) FROM Gauge g WHERE g.factory.id = :factoryId AND g.status = :status")
    long countByFactoryIdAndStatus(@Param("factoryId") UUID factoryId, @Param("status") GaugeStatus status);

    @Query("SELECT g FROM Gauge g JOIN g.operations op WHERE op.assignedTo.id = :workerId AND op.status IN ('QUEUED','IN_PROGRESS')")
    List<Gauge> findByAssignedWorkerId(@Param("workerId") UUID workerId);
}
