package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.PieceQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PieceQuestionRepository extends JpaRepository<PieceQuestion, UUID> {
}

