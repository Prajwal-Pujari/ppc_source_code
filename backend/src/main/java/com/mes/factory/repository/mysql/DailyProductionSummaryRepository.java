package com.mes.factory.repository.mysql;

import com.mes.factory.entity.mysql.DailyProductionSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyProductionSummaryRepository extends JpaRepository<DailyProductionSummary, Long> {

    List<DailyProductionSummary> findByFactoryIdAndSummaryDateBetween(UUID factoryId, LocalDate start, LocalDate end);

    Optional<DailyProductionSummary> findByFactoryIdAndSummaryDate(UUID factoryId, LocalDate summaryDate);
}
