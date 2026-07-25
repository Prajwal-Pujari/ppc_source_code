package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcQuestionSet;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PqcQuestionSetRepository extends JpaRepository<PqcQuestionSet, UUID> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"operationMaster", "gaugeMaster"})
    List<PqcQuestionSet> findByFactoryIdAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId);

    @Query("SELECT qs FROM PqcQuestionSet qs LEFT JOIN FETCH qs.questions q " +
           "WHERE qs.operationMaster.id = :operationMasterId AND qs.isActive = true " +
           "AND (qs.gaugeMaster IS NULL OR qs.gaugeMaster.id = :gaugeMasterId) " +
           "ORDER BY qs.gaugeMaster.id NULLS LAST, qs.createdAt DESC, q.sequenceOrder ASC")
    List<PqcQuestionSet> findActiveByOperationMasterIdAndGaugeMasterId(UUID operationMasterId, UUID gaugeMasterId);

    @Query("SELECT qs FROM PqcQuestionSet qs LEFT JOIN FETCH qs.questions q " +
           "WHERE qs.operationMaster.id = :operationMasterId AND qs.isActive = true AND qs.gaugeMaster IS NULL " +
           "ORDER BY q.sequenceOrder ASC")
    Optional<PqcQuestionSet> findActiveGlobalByOperationMasterId(UUID operationMasterId);

    Optional<PqcQuestionSet> findFirstByFactoryIdAndGaugeMasterIdAndOperationMasterIdAndNameAndIsActiveTrue(UUID factoryId, UUID gaugeMasterId, UUID operationMasterId, String name);

    @Query("SELECT DISTINCT qs FROM PqcQuestionSet qs " +
           "LEFT JOIN FETCH qs.operationMaster " +
           "LEFT JOIN FETCH qs.gaugeMaster " +
           "LEFT JOIN FETCH qs.questions " +
           "WHERE qs.factory.id = :factoryId " +
           "ORDER BY qs.createdAt DESC")
    List<PqcQuestionSet> findByFactoryIdOrderByCreatedAtDesc(UUID factoryId);
}
