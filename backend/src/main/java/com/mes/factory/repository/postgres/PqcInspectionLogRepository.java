package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcInspectionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PqcInspectionLogRepository extends JpaRepository<PqcInspectionLog, UUID> {
    List<PqcInspectionLog> findByGaugeOperationIdOrderByLogTimeDesc(UUID gaugeOperationId);

    @Query("SELECT COALESCE(SUM(l.passedQty), 0) FROM PqcInspectionLog l WHERE l.gaugeOperation.id = :operationId")
    int sumPassedQtyByOperationId(UUID operationId);

    @Query("SELECT COALESCE(SUM(l.actualQty), 0) FROM PqcInspectionLog l WHERE l.gaugeOperation.id = :operationId")
    int sumActualQtyByOperationId(UUID operationId);
}
