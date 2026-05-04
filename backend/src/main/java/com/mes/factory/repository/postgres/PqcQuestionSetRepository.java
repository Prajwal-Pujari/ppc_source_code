package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcQuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PqcQuestionSetRepository extends JpaRepository<PqcQuestionSet, UUID> {

    List<PqcQuestionSet> findByFactoryIdAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId);

    @Query("SELECT qs FROM PqcQuestionSet qs LEFT JOIN FETCH qs.questions q " +
           "WHERE qs.operationMaster.id = :operationMasterId AND qs.isActive = true " +
           "ORDER BY q.sequenceOrder ASC")
    Optional<PqcQuestionSet> findActiveByOperationMasterId(UUID operationMasterId);

    List<PqcQuestionSet> findByFactoryIdOrderByCreatedAtDesc(UUID factoryId);
}
