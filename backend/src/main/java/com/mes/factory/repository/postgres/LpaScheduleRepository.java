package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.LpaAuditType;
import com.mes.factory.entity.postgres.LpaSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface LpaScheduleRepository extends JpaRepository<LpaSchedule, UUID> {

    @Query("SELECT DISTINCT s FROM LpaSchedule s " +
           "LEFT JOIN FETCH s.questionSet " +
           "LEFT JOIN FETCH s.operationMaster " +
           "LEFT JOIN FETCH s.gaugeMaster " +
           "LEFT JOIN FETCH s.machineMaster " +
           "LEFT JOIN FETCH s.assignedTo " +
           "WHERE s.factory.id = :factoryId AND s.isActive = true " +
           "ORDER BY s.nextDueDate ASC")
    List<LpaSchedule> findByFactoryIdAndIsActiveTrueOrderByNextDueDateAsc(UUID factoryId);

    @Query("SELECT DISTINCT s FROM LpaSchedule s " +
           "LEFT JOIN FETCH s.questionSet " +
           "LEFT JOIN FETCH s.operationMaster " +
           "LEFT JOIN FETCH s.gaugeMaster " +
           "LEFT JOIN FETCH s.machineMaster " +
           "LEFT JOIN FETCH s.assignedTo " +
           "WHERE s.factory.id = :factoryId AND s.auditType = :auditType AND s.isActive = true " +
           "ORDER BY s.nextDueDate ASC")
    List<LpaSchedule> findByFactoryIdAndAuditTypeAndIsActiveTrue(UUID factoryId, LpaAuditType auditType);

    @Query("SELECT DISTINCT s FROM LpaSchedule s " +
           "LEFT JOIN FETCH s.questionSet " +
           "LEFT JOIN FETCH s.operationMaster " +
           "LEFT JOIN FETCH s.gaugeMaster " +
           "LEFT JOIN FETCH s.machineMaster " +
           "LEFT JOIN FETCH s.assignedTo " +
           "WHERE s.factory.id = :factoryId AND s.status IN :statuses AND s.isActive = true " +
           "ORDER BY s.nextDueDate ASC")
    List<LpaSchedule> findByFactoryIdAndStatusIn(UUID factoryId, List<String> statuses);

    @Query("SELECT DISTINCT s FROM LpaSchedule s " +
           "WHERE s.factory.id = :factoryId AND s.nextDueDate <= :now AND s.status = 'SCHEDULED' AND s.isActive = true")
    List<LpaSchedule> findDueSchedules(UUID factoryId, OffsetDateTime now);
}
