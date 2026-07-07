package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.LpaAuditType;
import com.mes.factory.entity.postgres.LpaQuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface LpaQuestionSetRepository extends JpaRepository<LpaQuestionSet, UUID> {

    @Query("SELECT DISTINCT qs FROM LpaQuestionSet qs " +
           "LEFT JOIN FETCH qs.operationMaster " +
           "LEFT JOIN FETCH qs.gaugeMaster " +
           "LEFT JOIN FETCH qs.machineMaster " +
           "LEFT JOIN FETCH qs.questions " +
           "WHERE qs.factory.id = :factoryId " +
           "ORDER BY qs.createdAt DESC")
    List<LpaQuestionSet> findByFactoryIdOrderByCreatedAtDesc(UUID factoryId);

    @Query("SELECT DISTINCT qs FROM LpaQuestionSet qs " +
           "LEFT JOIN FETCH qs.operationMaster " +
           "LEFT JOIN FETCH qs.gaugeMaster " +
           "LEFT JOIN FETCH qs.machineMaster " +
           "LEFT JOIN FETCH qs.questions " +
           "WHERE qs.factory.id = :factoryId AND qs.auditType = :auditType AND qs.isActive = true " +
           "ORDER BY qs.createdAt DESC")
    List<LpaQuestionSet> findByFactoryIdAndAuditTypeAndIsActiveTrue(UUID factoryId, LpaAuditType auditType);

    List<LpaQuestionSet> findByFactoryIdAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId);
}
