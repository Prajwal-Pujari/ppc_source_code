package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.ReportConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportConfigurationRepository extends JpaRepository<ReportConfiguration, UUID> {
    Optional<ReportConfiguration> findByFactoryId(UUID factoryId);
}
