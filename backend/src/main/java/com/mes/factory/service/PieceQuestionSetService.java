package com.mes.factory.service;

import com.mes.factory.dto.request.CreatePieceQuestionSetRequest;
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
public class PieceQuestionSetService {

    private final PieceQuestionSetRepository questionSetRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final GaugeMasterRepository gaugeMasterRepository;
    private final UserRepository userRepository;
    private final PqcQuestionSetRepository pqcQuestionSetRepository;

    public PieceQuestionSetService(PieceQuestionSetRepository questionSetRepository,
                                  OperationMasterRepository operationMasterRepository,
                                  GaugeMasterRepository gaugeMasterRepository,
                                  UserRepository userRepository,
                                  PqcQuestionSetRepository pqcQuestionSetRepository) {
        this.questionSetRepository = questionSetRepository;
        this.operationMasterRepository = operationMasterRepository;
        this.gaugeMasterRepository = gaugeMasterRepository;
        this.userRepository = userRepository;
        this.pqcQuestionSetRepository = pqcQuestionSetRepository;
    }

    @Transactional(readOnly = true)
    public List<PieceQuestionSet> getAllByFactory(UUID factoryId, PieceType pieceType) {
        if (pieceType != null) {
            return questionSetRepository.findByFactoryIdAndPieceTypeWithQuestions(factoryId, pieceType);
        }
        return questionSetRepository.findByFactoryIdWithQuestions(factoryId);
    }

    @Transactional(readOnly = true)
    public PieceQuestionSet getById(UUID id) {
        return questionSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PieceQuestionSet", "id", id));
    }

    @Transactional(readOnly = true)
    public Optional<PieceQuestionSet> getForOperationAndGauge(UUID operationMasterId, PieceType pieceType, UUID gaugeMasterId) {
        List<PieceQuestionSet> sets = questionSetRepository.findActiveByOperationAndType(
                operationMasterId, pieceType != null ? pieceType : PieceType.FIRST_PIECE, gaugeMasterId);
        if (!sets.isEmpty()) {
            return Optional.of(sets.get(0));
        }
        return Optional.empty();
    }

    @Transactional
    public PieceQuestionSet create(UUID userId, CreatePieceQuestionSetRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        OperationMaster opMaster = operationMasterRepository.findById(request.getOperationMasterId())
                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", request.getOperationMasterId()));

        GaugeMaster gaugeMaster = null;
        if (request.getGaugeMasterId() != null) {
            gaugeMaster = gaugeMasterRepository.findById(request.getGaugeMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", request.getGaugeMasterId()));
        }

        PieceQuestionSet set = PieceQuestionSet.builder()
                .pieceType(request.getPieceType() != null ? request.getPieceType() : PieceType.FIRST_PIECE)
                .operationMaster(opMaster)
                .gaugeMaster(gaugeMaster)
                .factory(user.getFactory())
                .name(request.getName())
                .createdBy(user)
                .build();

        if (request.getQuestions() != null) {
            List<PieceQuestion> questions = new ArrayList<>();
            int seq = 1;
            for (CreatePieceQuestionSetRequest.QuestionItem item : request.getQuestions()) {
                PieceQuestion q = PieceQuestion.builder()
                        .questionSet(set)
                        .sequenceOrder(item.getSequenceOrder() != null ? item.getSequenceOrder() : seq)
                        .questionText(item.getQuestionText())
                        .questionType(QuestionType.valueOf(item.getQuestionType()))
                        .expectedAnswer(item.getExpectedAnswer())
                        .unit(item.getUnit())
                        .minValue(item.getMinValue())
                        .maxValue(item.getMaxValue())
                        .choices(item.getChoices())
                        .isCritical(Boolean.TRUE.equals(item.getIsCritical()))
                        .checkingMethod(item.getCheckingMethod())
                        .build();
                questions.add(q);
                seq++;
            }
            set.setQuestions(questions);
        }

        return questionSetRepository.save(set);
    }

    @Transactional
    public PieceQuestionSet update(UUID id, UUID userId, CreatePieceQuestionSetRequest request) {
        PieceQuestionSet set = getById(id);

        if (request.getPieceType() != null) {
            set.setPieceType(request.getPieceType());
        }
        if (request.getName() != null) {
            set.setName(request.getName());
        }
        if (request.getOperationMasterId() != null && !request.getOperationMasterId().equals(set.getOperationMaster().getId())) {
            OperationMaster op = operationMasterRepository.findById(request.getOperationMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", request.getOperationMasterId()));
            set.setOperationMaster(op);
        }
        if (request.getGaugeMasterId() != null) {
            GaugeMaster gm = gaugeMasterRepository.findById(request.getGaugeMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("GaugeMaster", "id", request.getGaugeMasterId()));
            set.setGaugeMaster(gm);
        } else {
            set.setGaugeMaster(null);
        }

        set.getQuestions().clear();

        if (request.getQuestions() != null) {
            int seq = 1;
            for (CreatePieceQuestionSetRequest.QuestionItem item : request.getQuestions()) {
                PieceQuestion q = PieceQuestion.builder()
                        .questionSet(set)
                        .sequenceOrder(item.getSequenceOrder() != null ? item.getSequenceOrder() : seq)
                        .questionText(item.getQuestionText())
                        .questionType(QuestionType.valueOf(item.getQuestionType()))
                        .expectedAnswer(item.getExpectedAnswer())
                        .unit(item.getUnit())
                        .minValue(item.getMinValue())
                        .maxValue(item.getMaxValue())
                        .choices(item.getChoices())
                        .isCritical(Boolean.TRUE.equals(item.getIsCritical()))
                        .checkingMethod(item.getCheckingMethod())
                        .build();
                set.getQuestions().add(q);
                seq++;
            }
        }

        return questionSetRepository.save(set);
    }

    @Transactional
    public void delete(UUID id) {
        PieceQuestionSet set = getById(id);
        questionSetRepository.delete(set);
    }
}

