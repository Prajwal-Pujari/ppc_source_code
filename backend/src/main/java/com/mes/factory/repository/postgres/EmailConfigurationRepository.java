package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.EmailConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailConfigurationRepository extends JpaRepository<EmailConfiguration, UUID> {
    Optional<EmailConfiguration> findByFactoryId(UUID factoryId);
}
