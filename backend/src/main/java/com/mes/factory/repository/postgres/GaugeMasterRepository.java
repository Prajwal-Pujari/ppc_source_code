package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.GaugeMaster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GaugeMasterRepository extends JpaRepository<GaugeMaster, UUID> {

    Page<GaugeMaster> findByFactoryIdAndIsActiveTrue(UUID factoryId, Pageable pageable);

    java.util.Optional<GaugeMaster> findFirstByFactoryIdAndGaugeTypeNameAndIsActiveTrue(UUID factoryId, String gaugeTypeName);
}
