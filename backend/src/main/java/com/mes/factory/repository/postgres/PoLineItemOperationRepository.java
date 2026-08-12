package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PoLineItemOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PoLineItemOperationRepository extends JpaRepository<PoLineItemOperation, UUID> {

    List<PoLineItemOperation> findByPoLineItemIdOrderBySequenceOrder(UUID poLineItemId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p.machineMaster.id FROM PoLineItemOperation p WHERE p.machineMaster IS NOT NULL AND p.poLineItem.purchaseOrder.status = com.mes.factory.entity.postgres.PoStatus.DRAFT")
    List<UUID> findPlannedMachineIds();

    @org.springframework.data.jpa.repository.Query("SELECT p FROM PoLineItemOperation p WHERE p.machineMaster IS NOT NULL AND p.poLineItem.purchaseOrder.status IN (com.mes.factory.entity.postgres.PoStatus.DRAFT, com.mes.factory.entity.postgres.PoStatus.IN_PROGRESS, com.mes.factory.entity.postgres.PoStatus.CONFIRMED)")
    List<PoLineItemOperation> findAllocatedOperations();
}
