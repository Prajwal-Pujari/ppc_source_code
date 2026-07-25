package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.OperationMaster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OperationMasterRepository extends JpaRepository<OperationMaster, UUID> {

    Page<OperationMaster> findByFactoryIdAndIsActiveTrue(UUID factoryId, Pageable pageable);

    List<OperationMaster> findByFactoryIdAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId);
    
    Optional<OperationMaster> findFirstByFactoryIdAndOperationNameAndIsActiveTrue(UUID factoryId, String operationName);
}
