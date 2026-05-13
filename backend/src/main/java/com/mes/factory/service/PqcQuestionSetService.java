package com.mes.factory.service;

import com.mes.factory.dto.request.CreateQuestionSetRequest;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PqcQuestionSetService {

    private final PqcQuestionSetRepository questionSetRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final GaugeMasterRepository gaugeMasterRepository;
    private final UserRepository userRepository;

    public PqcQuestionSetService(PqcQuestionSetRepository questionSetRepository,
                                  OperationMasterRepository operationMasterRepository,
                                  GaugeMasterRepository gaugeMasterRepository,
                                  UserRepository userRepository) {
        this.questionSetRepository = questionSetRepository;
        this.operationMasterRepository = operationMasterRepository;
        this.gaugeMasterRepository = gaugeMasterRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<PqcQuestionSet> getAllByFactory(UUID factoryId) {
        return questionSetRepository.findByFactoryIdOrderByCreatedAtDesc(factoryId);
    }

    @Transactional(readOnly = true)
    public PqcQuestionSet getById(UUID id) {
        return questionSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PqcQuestionSet", "id", id));
    }

    @Transactional(readOnly = true)
    public Optional<PqcQuestionSet> getForOperationAndGauge(UUID operationMasterId, UUID gaugeMasterId) {
        if (gaugeMasterId != null) {
            List<PqcQuestionSet> sets = questionSetRepository.findActiveByOperationMasterIdAndGaugeMasterId(operationMasterId, gaugeMasterId);
            if (!sets.isEmpty()) {
                return Optional.of(sets.get(0)); // Gets the best match due to ORDER BY
            }
        }
        return questionSetRepository.findActiveGlobalByOperationMasterId(operationMasterId);
    }

    @Transactional
    public PqcQuestionSet create(UUID userId, CreateQuestionSetRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        OperationMaster opMaster = operationMasterRepository.findById(request.getOperationMasterId())
                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", request.getOperationMasterId()));

        GaugeMaster gaugeMaster = null;
        if (request.getGaugeMasterId() != null) {
            gaugeMaster = gaugeMasterRepository.findById(request.getGaugeMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", request.getGaugeMasterId()));
        }

        PqcQuestionSet set = PqcQuestionSet.builder()
                .operationMaster(opMaster)
                .gaugeMaster(gaugeMaster)
                .factory(user.getFactory())
                .name(request.getName())
                .inspectionFrequency(request.getInspectionFrequency())
                .createdBy(user)
                .build();

        if (request.getQuestions() != null) {
            List<PqcQuestion> questions = new ArrayList<>();
            int seq = 1;
            for (CreateQuestionSetRequest.QuestionItem item : request.getQuestions()) {
                PqcQuestion q = PqcQuestion.builder()
                        .questionSet(set)
                        .sequenceOrder(item.getSequenceOrder() != null ? item.getSequenceOrder() : seq)
                        .questionText(item.getQuestionText())
                        .questionType(QuestionType.valueOf(item.getQuestionType()))
                        .expectedAnswer(item.getExpectedAnswer())
                        .unit(item.getUnit())
                        .minValue(item.getMinValue())
                        .maxValue(item.getMaxValue())
                        .choices(item.getChoices())
                        .isCritical(item.getIsCritical() != null ? item.getIsCritical() : false)
                        .build();
                questions.add(q);
                seq++;
            }
            set.setQuestions(questions);
        }

        return questionSetRepository.save(set);
    }

    @Transactional
    public PqcQuestionSet update(UUID setId, CreateQuestionSetRequest request) {
        PqcQuestionSet set = getById(setId);

        set.setName(request.getName());
        set.setInspectionFrequency(request.getInspectionFrequency());

        if (request.getOperationMasterId() != null) {
            OperationMaster opMaster = operationMasterRepository.findById(request.getOperationMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", request.getOperationMasterId()));
            set.setOperationMaster(opMaster);
        }

        if (request.getGaugeMasterId() != null) {
            GaugeMaster gaugeMaster = gaugeMasterRepository.findById(request.getGaugeMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", request.getGaugeMasterId()));
            set.setGaugeMaster(gaugeMaster);
        } else {
            set.setGaugeMaster(null);
        }

        // Replace questions
        set.getQuestions().clear();
        if (request.getQuestions() != null) {
            int seq = 1;
            for (CreateQuestionSetRequest.QuestionItem item : request.getQuestions()) {
                PqcQuestion q = PqcQuestion.builder()
                        .questionSet(set)
                        .sequenceOrder(item.getSequenceOrder() != null ? item.getSequenceOrder() : seq)
                        .questionText(item.getQuestionText())
                        .questionType(QuestionType.valueOf(item.getQuestionType()))
                        .expectedAnswer(item.getExpectedAnswer())
                        .unit(item.getUnit())
                        .minValue(item.getMinValue())
                        .maxValue(item.getMaxValue())
                        .choices(item.getChoices())
                        .isCritical(item.getIsCritical() != null ? item.getIsCritical() : false)
                        .build();
                set.getQuestions().add(q);
                seq++;
            }
        }

        return questionSetRepository.save(set);
    }

    @Transactional
    public void delete(UUID setId) {
        PqcQuestionSet set = getById(setId);
        set.setIsActive(false);
        questionSetRepository.save(set);
    }
}
