package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.LpaAuditLog;
import com.mes.factory.entity.postgres.LpaAuditType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface LpaAuditLogRepository extends JpaRepository<LpaAuditLog, UUID> {

    @Query("SELECT DISTINCT l FROM LpaAuditLog l " +
           "LEFT JOIN FETCH l.questionSet " +
           "LEFT JOIN FETCH l.operationMaster " +
           "LEFT JOIN FETCH l.gaugeMaster " +
           "LEFT JOIN FETCH l.machineMaster " +
           "LEFT JOIN FETCH l.auditedBy " +
           "LEFT JOIN FETCH l.auditee " +
           "LEFT JOIN FETCH l.answers " +
           "WHERE l.factory.id = :factoryId " +
           "ORDER BY l.auditDate DESC")
    List<LpaAuditLog> findByFactoryIdOrderByAuditDateDesc(UUID factoryId);

    @Query("SELECT DISTINCT l FROM LpaAuditLog l " +
           "LEFT JOIN FETCH l.questionSet " +
           "LEFT JOIN FETCH l.operationMaster " +
           "LEFT JOIN FETCH l.gaugeMaster " +
           "LEFT JOIN FETCH l.machineMaster " +
           "LEFT JOIN FETCH l.auditedBy " +
           "LEFT JOIN FETCH l.auditee " +
           "WHERE l.factory.id = :factoryId AND l.auditType = :auditType " +
           "ORDER BY l.auditDate DESC")
    List<LpaAuditLog> findByFactoryIdAndAuditTypeOrderByAuditDateDesc(UUID factoryId, LpaAuditType auditType);

    @Query("SELECT COUNT(l) FROM LpaAuditLog l WHERE l.factory.id = :factoryId AND l.overallStatus = :status")
    long countByFactoryIdAndOverallStatus(UUID factoryId, String status);

    @Query("SELECT l FROM LpaAuditLog l WHERE l.factory.id = :factoryId AND l.auditDate >= :since ORDER BY l.auditDate DESC")
    List<LpaAuditLog> findRecentLogs(UUID factoryId, OffsetDateTime since);
}
