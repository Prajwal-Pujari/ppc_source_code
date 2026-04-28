package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.GaugeMasterOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GaugeMasterOperationRepository extends JpaRepository<GaugeMasterOperation, UUID> {

    List<GaugeMasterOperation> findByGaugeMasterIdOrderBySequenceOrder(UUID gaugeMasterId);

    void deleteByGaugeMasterIdAndOperationMasterId(UUID gaugeMasterId, UUID operationMasterId);
}
