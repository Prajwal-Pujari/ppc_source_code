package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "machine_setup_log_answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MachineSetupLogAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_setup_log_id", nullable = false)
    @JsonBackReference
    private MachineSetupLog machineSetupLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private MachineSetupQuestion question;

    @Column(name = "answer_value", columnDefinition = "TEXT")
    private String answerValue;

    @Column(name = "is_compliant")
    private Boolean isCompliant;

    @Column(name = "time_taken_seconds")
    @Builder.Default
    private Integer timeTakenSeconds = 0;
}
