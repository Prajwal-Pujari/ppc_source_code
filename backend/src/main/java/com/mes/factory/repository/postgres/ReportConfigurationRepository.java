package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.ReportConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportConfigurationRepository extends JpaRepository<ReportConfiguration, String> {
}
