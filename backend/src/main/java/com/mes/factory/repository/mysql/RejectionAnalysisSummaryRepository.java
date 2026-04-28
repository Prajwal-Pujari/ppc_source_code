package com.mes.factory.repository.mysql;

import com.mes.factory.entity.mysql.RejectionAnalysisSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RejectionAnalysisSummaryRepository extends JpaRepository<RejectionAnalysisSummary, Long> {

    List<RejectionAnalysisSummary> findByFactoryIdAndPeriodMonth(UUID factoryId, String periodMonth);

    void deleteByFactoryIdAndPeriodMonth(UUID factoryId, String periodMonth);
}
