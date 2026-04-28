package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PoLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PoLineItemRepository extends JpaRepository<PoLineItem, UUID> {

    List<PoLineItem> findByPurchaseOrderId(UUID purchaseOrderId);
}
