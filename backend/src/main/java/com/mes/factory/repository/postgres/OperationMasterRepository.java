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

    @org.springframework.data.jpa.repository.Query("SELECT o FROM OperationMaster o WHERE o.factory.id = :factoryId AND o.isActive = true AND " +
            "(LOWER(o.operationName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.operationCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<OperationMaster> findByFactoryIdAndIsActiveTrueAndSearchTerm(UUID factoryId, @org.springframework.data.repository.query.Param("search") String search, Pageable pageable);

    List<OperationMaster> findByFactoryIdAndIsActiveTrueOrderByCreatedAtDesc(UUID factoryId);
    
    Optional<OperationMaster> findFirstByFactoryIdAndOperationNameAndIsActiveTrue(UUID factoryId, String operationName);
    
    Optional<OperationMaster> findFirstByFactoryIdAndOperationCode(UUID factoryId, String operationCode);
    
    Optional<OperationMaster> findFirstByFactoryIdAndOperationCodeAndIsActiveTrue(UUID factoryId, String operationCode);
}
