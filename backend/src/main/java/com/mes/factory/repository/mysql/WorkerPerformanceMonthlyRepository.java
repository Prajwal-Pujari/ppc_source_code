package com.mes.factory.repository.mysql;

import com.mes.factory.entity.mysql.WorkerPerformanceMonthly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkerPerformanceMonthlyRepository extends JpaRepository<WorkerPerformanceMonthly, Long> {

    List<WorkerPerformanceMonthly> findByFactoryIdAndYearMonth(UUID factoryId, String yearMonth);

    Optional<WorkerPerformanceMonthly> findByFactoryIdAndWorkerIdAndYearMonth(UUID factoryId, UUID workerId, String yearMonth);

    @Query("SELECT w FROM WorkerPerformanceMonthly w WHERE w.factoryId = :factoryId AND w.yearMonth = :yearMonth " +
            "ORDER BY w.operationsCompleted DESC")
    List<WorkerPerformanceMonthly> findTopWorkersByFactoryIdAndYearMonth(@Param("factoryId") UUID factoryId,
                                                                         @Param("yearMonth") String yearMonth);
}
