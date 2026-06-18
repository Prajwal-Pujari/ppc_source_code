package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcShiftApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PqcShiftApprovalRepository extends JpaRepository<PqcShiftApproval, UUID> {
    List<PqcShiftApproval> findByGaugeId(UUID gaugeId);
    Optional<PqcShiftApproval> findByGaugeIdAndShiftIdAndInspectionDate(UUID gaugeId, UUID shiftId, String inspectionDate);
}
