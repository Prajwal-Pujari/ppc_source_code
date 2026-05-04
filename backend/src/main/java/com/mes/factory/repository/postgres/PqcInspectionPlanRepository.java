package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcInspectionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PqcInspectionPlanRepository extends JpaRepository<PqcInspectionPlan, UUID> {
    Optional<PqcInspectionPlan> findByGaugeMasterIdAndOperationMasterId(UUID gaugeMasterId, UUID operationMasterId);
}
