package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.MachineMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MachineMasterRepository extends JpaRepository<MachineMaster, UUID> {
    List<MachineMaster> findByFactoryIdAndIsActiveTrue(UUID factoryId);
}
