package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PoStatus;
import com.mes.factory.entity.postgres.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    @Query(
        value = "SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.customer WHERE po.factory.id = :factoryId",
        countQuery = "SELECT COUNT(po) FROM PurchaseOrder po WHERE po.factory.id = :factoryId"
    )
    Page<PurchaseOrder> findByFactoryId(@Param("factoryId") UUID factoryId, Pageable pageable);

    @Query(
        value = "SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.customer WHERE po.factory.id = :factoryId AND po.status = :status",
        countQuery = "SELECT COUNT(po) FROM PurchaseOrder po WHERE po.factory.id = :factoryId AND po.status = :status"
    )
    Page<PurchaseOrder> findByFactoryIdAndStatus(@Param("factoryId") UUID factoryId,
                                                  @Param("status") PoStatus status,
                                                  Pageable pageable);

    @Query(
        value = "SELECT DISTINCT po FROM PurchaseOrder po LEFT JOIN FETCH po.customer c " +
                "WHERE po.factory.id = :factoryId AND " +
                "(LOWER(po.poNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                "EXISTS (SELECT 1 FROM Gauge g WHERE g.purchaseOrder = po AND (LOWER(g.serialNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(g.gaugeTypeName) LIKE LOWER(CONCAT('%', :search, '%')))))",
        countQuery = "SELECT COUNT(DISTINCT po) FROM PurchaseOrder po LEFT JOIN po.customer c " +
                     "WHERE po.factory.id = :factoryId AND " +
                     "(LOWER(po.poNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                     "EXISTS (SELECT 1 FROM Gauge g WHERE g.purchaseOrder = po AND (LOWER(g.serialNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(g.gaugeTypeName) LIKE LOWER(CONCAT('%', :search, '%')))))"
    )
    Page<PurchaseOrder> searchByPoNumberOrCustomerName(@Param("factoryId") UUID factoryId,
                                                        @Param("search") String search,
                                                        Pageable pageable);

    @Query("SELECT po FROM PurchaseOrder po WHERE po.factory.id = :factoryId AND po.status NOT IN ('COMPLETED','CANCELLED') " +
            "AND po.expectedDeliveryDate <= :deadline")
    List<PurchaseOrder> findPOsDueBefore(@Param("factoryId") UUID factoryId,
                                          @Param("deadline") java.time.LocalDate deadline);

    default List<PurchaseOrder> findPOsDueWithinDays(UUID factoryId, int days) {
        return findPOsDueBefore(factoryId, java.time.LocalDate.now().plusDays(days));
    }

    List<PurchaseOrder> findByFactoryIdAndStatusNot(UUID factoryId, PoStatus status);
}