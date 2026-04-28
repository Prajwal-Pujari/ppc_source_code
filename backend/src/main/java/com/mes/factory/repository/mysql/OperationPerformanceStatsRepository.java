package com.mes.factory.repository.mysql;

import com.mes.factory.entity.mysql.OperationPerformanceStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OperationPerformanceStatsRepository extends JpaRepository<OperationPerformanceStats, Long> {

    List<OperationPerformanceStats> findByFactoryIdAndStatsMonth(UUID factoryId, String statsMonth);

    Optional<OperationPerformanceStats> findByFactoryIdAndOperationNameAndStatsMonth(UUID factoryId, String operationName, String statsMonth);
}
