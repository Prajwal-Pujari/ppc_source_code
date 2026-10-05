package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.SupplierAuditQuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SupplierAuditQuestionSetRepository extends JpaRepository<SupplierAuditQuestionSet, UUID> {
    List<SupplierAuditQuestionSet> findByFactoryId(UUID factoryId);
}
