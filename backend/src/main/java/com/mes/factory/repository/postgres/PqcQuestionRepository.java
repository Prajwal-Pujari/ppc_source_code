package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PqcQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PqcQuestionRepository extends JpaRepository<PqcQuestion, UUID> {
}
