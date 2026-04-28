package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PoComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PoCommentRepository extends JpaRepository<PoComment, UUID> {

    List<PoComment> findByPurchaseOrderIdOrderByCreatedAtDesc(UUID purchaseOrderId);
}
