package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcRejectionCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PqcRejectionCodeRepository extends JpaRepository<PqcRejectionCode, UUID> {
    List<PqcRejectionCode> findByFactoryIdAndIsActiveTrue(UUID factoryId);
}
