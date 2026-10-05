package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.SystemAuditQuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SystemAuditQuestionSetRepository extends JpaRepository<SystemAuditQuestionSet, UUID> {
    List<SystemAuditQuestionSet> findByFactoryId(UUID factoryId);
}
