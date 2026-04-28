package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.Factory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FactoryRepository extends JpaRepository<Factory, UUID> {

    Optional<Factory> findByCode(String code);
}
