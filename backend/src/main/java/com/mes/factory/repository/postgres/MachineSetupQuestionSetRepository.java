package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.MachineSetupQuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MachineSetupQuestionSetRepository extends JpaRepository<MachineSetupQuestionSet, UUID> {

    @Query("SELECT s FROM MachineSetupQuestionSet s LEFT JOIN FETCH s.machineMaster LEFT JOIN FETCH s.operationMaster LEFT JOIN FETCH s.gaugeMaster LEFT JOIN FETCH s.questions WHERE s.machineMaster.id = :machineId AND s.operationMaster.id = :operationId AND (s.gaugeMaster.id = :gaugeId OR s.gaugeMaster IS NULL) AND s.isActive = true ORDER BY s.gaugeMaster.id ASC, s.createdAt DESC")
    List<MachineSetupQuestionSet> findConfig(@Param("machineId") UUID machineId, @Param("operationId") UUID operationId, @Param("gaugeId") UUID gaugeId);

    @Query("SELECT s FROM MachineSetupQuestionSet s LEFT JOIN FETCH s.machineMaster LEFT JOIN FETCH s.operationMaster LEFT JOIN FETCH s.gaugeMaster LEFT JOIN FETCH s.questions WHERE s.factory.id = :factoryId AND s.isActive = true ORDER BY s.createdAt DESC")
    List<MachineSetupQuestionSet> findByFactoryId(@Param("factoryId") UUID factoryId);

    @Query("SELECT s FROM MachineSetupQuestionSet s LEFT JOIN FETCH s.machineMaster LEFT JOIN FETCH s.operationMaster LEFT JOIN FETCH s.gaugeMaster LEFT JOIN FETCH s.questions ORDER BY s.createdAt DESC")
    List<MachineSetupQuestionSet> findAllWithRelations();
}
