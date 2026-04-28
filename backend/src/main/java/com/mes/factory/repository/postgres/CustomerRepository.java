package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Page<Customer> findByFactoryIdAndIsActiveTrue(UUID factoryId, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.factory.id = :factoryId AND LOWER(c.name) = LOWER(:name) AND c.isActive = true")
    Optional<Customer> findByFactoryIdAndNameIgnoreCase(@Param("factoryId") UUID factoryId, @Param("name") String name);

    @Query("SELECT c FROM Customer c WHERE c.factory.id = :factoryId AND c.isActive = true AND " +
            "(LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.gstNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Customer> searchByNameOrGst(@Param("factoryId") UUID factoryId, @Param("search") String search, Pageable pageable);
}
