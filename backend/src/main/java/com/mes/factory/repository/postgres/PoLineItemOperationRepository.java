package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PoLineItemOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PoLineItemOperationRepository extends JpaRepository<PoLineItemOperation, UUID> {

    List<PoLineItemOperation> findByPoLineItemIdOrderBySequenceOrder(UUID poLineItemId);
}
