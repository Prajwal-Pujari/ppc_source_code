package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.LpaQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LpaQuestionRepository extends JpaRepository<LpaQuestion, UUID> {
    List<LpaQuestion> findByQuestionSetIdOrderBySequenceOrderAsc(UUID questionSetId);
}
