package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.LpaAuditLogAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface LpaAuditLogAnswerRepository extends JpaRepository<LpaAuditLogAnswer, UUID> {
    List<LpaAuditLogAnswer> findByAuditLogIdOrderBySequenceOrderAsc(UUID auditLogId);

    @Query("SELECT a FROM LpaAuditLogAnswer a WHERE a.auditLog.factory.id = :factoryId AND a.status IN ('NON_CONFORMING', 'SCOPE_OF_IMPROVEMENT') ORDER BY a.auditLog.auditDate DESC")
    List<LpaAuditLogAnswer> findOpenNonConformingAnswers(UUID factoryId);
}
