package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PieceQuestionSet;
import com.mes.factory.entity.postgres.PieceType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PieceQuestionSetRepository extends JpaRepository<PieceQuestionSet, UUID> {

    @EntityGraph(attributePaths = {"operationMaster", "gaugeMaster"})
    List<PieceQuestionSet> findByFactoryIdAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId);

    @EntityGraph(attributePaths = {"operationMaster", "gaugeMaster"})
    List<PieceQuestionSet> findByFactoryIdAndPieceTypeAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId, PieceType pieceType);

    @Query("SELECT DISTINCT qs FROM PieceQuestionSet qs " +
           "LEFT JOIN FETCH qs.operationMaster " +
           "LEFT JOIN FETCH qs.gaugeMaster " +
           "LEFT JOIN FETCH qs.questions q " +
           "WHERE qs.factory.id = :factoryId " +
           "ORDER BY qs.createdAt DESC, q.sequenceOrder ASC")
    List<PieceQuestionSet> findByFactoryIdWithQuestions(@Param("factoryId") UUID factoryId);

    @Query("SELECT DISTINCT qs FROM PieceQuestionSet qs " +
           "LEFT JOIN FETCH qs.operationMaster " +
           "LEFT JOIN FETCH qs.gaugeMaster " +
           "LEFT JOIN FETCH qs.questions q " +
           "WHERE qs.factory.id = :factoryId AND (qs.pieceType = :pieceType OR qs.pieceType = 'BOTH') " +
           "ORDER BY qs.createdAt DESC, q.sequenceOrder ASC")
    List<PieceQuestionSet> findByFactoryIdAndPieceTypeWithQuestions(@Param("factoryId") UUID factoryId, @Param("pieceType") PieceType pieceType);

    @Query("SELECT qs FROM PieceQuestionSet qs LEFT JOIN FETCH qs.questions q " +
           "WHERE qs.operationMaster.id = :operationMasterId AND qs.isActive = true " +
           "AND (qs.pieceType = :pieceType OR qs.pieceType = 'BOTH') " +
           "AND (qs.gaugeMaster IS NULL OR qs.gaugeMaster.id = :gaugeMasterId) " +
           "ORDER BY qs.gaugeMaster.id NULLS LAST, qs.createdAt DESC, q.sequenceOrder ASC")
    List<PieceQuestionSet> findActiveByOperationAndType(
            @Param("operationMasterId") UUID operationMasterId,
            @Param("pieceType") PieceType pieceType,
            @Param("gaugeMasterId") UUID gaugeMasterId);
}

