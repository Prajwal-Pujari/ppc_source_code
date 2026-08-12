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

    @org.springframework.data.jpa.repository.Query("SELECT g FROM GaugeMaster g WHERE g.factory.id = :factoryId AND g.isActive = true AND " +
            "(LOWER(g.gaugeTypeName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(g.categoryCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<GaugeMaster> findByFactoryIdAndIsActiveTrueAndSearchTerm(UUID factoryId, @org.springframework.data.repository.query.Param("search") String search, Pageable pageable);

    java.util.Optional<GaugeMaster> findFirstByFactoryIdAndGaugeTypeNameAndIsActiveTrue(UUID factoryId, String gaugeTypeName);
    java.util.Optional<GaugeMaster> findFirstByFactoryIdAndCategoryCodeAndIsActiveTrue(UUID factoryId, String categoryCode);
}
