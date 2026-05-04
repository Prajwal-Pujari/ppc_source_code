package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.FactoryShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FactoryShiftRepository extends JpaRepository<FactoryShift, UUID> {
    List<FactoryShift> findByFactoryIdAndIsActiveTrue(UUID factoryId);
}
