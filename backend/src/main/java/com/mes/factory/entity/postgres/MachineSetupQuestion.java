package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "machine_setup_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MachineSetupQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_set_id", nullable = false)
    @JsonBackReference
    private MachineSetupQuestionSet questionSet;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType; // Using the existing QuestionType enum (BOOLEAN, NUMBER, TEXT, MULTIPLE_CHOICE)

    @Column(name = "expected_answer")
    private String expectedAnswer;

    @Column(name = "unit", length = 30)
    private String unit;

    @Column(name = "min_value")
    private BigDecimal minValue;

    @Column(name = "max_value")
    private BigDecimal maxValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> choices;

    @Column(name = "is_critical")
    @Builder.Default
    private Boolean isCritical = false;

    @Column(name = "checking_method")
    private String checkingMethod;
}
