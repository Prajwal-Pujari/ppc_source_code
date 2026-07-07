package com.mes.factory.service;

import com.mes.factory.dto.request.CreateLpaQuestionSetRequest;
import com.mes.factory.dto.request.CreateLpaScheduleRequest;
import com.mes.factory.dto.request.SubmitLpaAuditRequest;
import com.mes.factory.dto.response.LpaDashboardSummary;
import com.mes.factory.dto.response.NotificationMessage;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.repository.postgres.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LpaService {

    private final LpaQuestionSetRepository questionSetRepository;
    private final LpaQuestionRepository questionRepository;
    private final LpaScheduleRepository scheduleRepository;
    private final LpaAuditLogRepository auditLogRepository;
    private final LpaAuditLogAnswerRepository answerRepository;
    private final FactoryRepository factoryRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final GaugeMasterRepository gaugeMasterRepository;
    private final MachineMasterRepository machineMasterRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public LpaQuestionSet createQuestionSet(UUID factoryId, UUID userId, CreateLpaQuestionSetRequest request) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new RuntimeException("Factory not found"));
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        OperationMaster op = request.getOperationMasterId() != null ?
                operationMasterRepository.findById(request.getOperationMasterId()).orElse(null) : null;
        GaugeMaster gm = request.getGaugeMasterId() != null ?
                gaugeMasterRepository.findById(request.getGaugeMasterId()).orElse(null) : null;
        MachineMaster mm = request.getMachineMasterId() != null ?
                machineMasterRepository.findById(request.getMachineMasterId()).orElse(null) : null;

        LpaQuestionSet qs = LpaQuestionSet.builder()
                .factory(factory)
                .auditType(request.getAuditType())
                .name(request.getName())
                .description(request.getDescription())
                .operationMaster(op)
                .gaugeMaster(gm)
                .machineMaster(mm)
                .defaultFrequency(request.getDefaultFrequency() != null ? request.getDefaultFrequency() : "DAILY")
                .isActive(true)
                .createdBy(user)
                .build();

        qs = questionSetRepository.save(qs);

        if (request.getQuestions() != null) {
            int seq = 1;
            for (CreateLpaQuestionSetRequest.QuestionItem qi : request.getQuestions()) {
                QuestionType qt;
                try {
                    qt = QuestionType.valueOf(qi.getQuestionType());
                } catch (Exception e) {
                    qt = QuestionType.PASS_FAIL;
                }
                LpaQuestion q = LpaQuestion.builder()
                        .questionSet(qs)
                        .sequenceOrder(qi.getSequenceOrder() != null ? qi.getSequenceOrder() : seq++)
                        .questionText(qi.getQuestionText())
                        .questionType(qt)
                        .expectedAnswer(qi.getExpectedAnswer())
                        .unit(qi.getUnit())
                        .minValue(qi.getMinValue())
                        .maxValue(qi.getMaxValue())
                        .choices(qi.getChoices())
                        .isCritical(qi.getIsCritical() != null ? qi.getIsCritical() : false)
                        .checkingMethod(qi.getCheckingMethod())
                        .reactionPlan(qi.getReactionPlan())
                        .isActive(true)
                        .build();
                questionRepository.save(q);
            }
        }

        return questionSetRepository.findById(qs.getId()).orElse(qs);
    }

    public List<LpaQuestionSet> getQuestionSets(UUID factoryId, LpaAuditType auditType) {
        if (auditType != null) {
            return questionSetRepository.findByFactoryIdAndAuditTypeAndIsActiveTrue(factoryId, auditType);
        }
        return questionSetRepository.findByFactoryIdOrderByCreatedAtDesc(factoryId);
    }

    @Transactional
    public LpaSchedule createSchedule(UUID factoryId, CreateLpaScheduleRequest request) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new RuntimeException("Factory not found"));
        LpaQuestionSet qs = questionSetRepository.findById(request.getQuestionSetId())
                .orElseThrow(() -> new RuntimeException("Question set not found"));

        OperationMaster op = request.getOperationMasterId() != null ?
                operationMasterRepository.findById(request.getOperationMasterId()).orElse(null) : qs.getOperationMaster();
        GaugeMaster gm = request.getGaugeMasterId() != null ?
                gaugeMasterRepository.findById(request.getGaugeMasterId()).orElse(null) : qs.getGaugeMaster();
        MachineMaster mm = request.getMachineMasterId() != null ?
                machineMasterRepository.findById(request.getMachineMasterId()).orElse(null) : qs.getMachineMaster();

        User assignedTo = request.getAssignedToId() != null ?
                userRepository.findById(request.getAssignedToId()).orElse(null) : null;

        LpaSchedule schedule = LpaSchedule.builder()
                .factory(factory)
                .auditType(request.getAuditType())
                .questionSet(qs)
                .operationMaster(op)
                .gaugeMaster(gm)
                .machineMaster(mm)
                .assignedTo(assignedTo)
                .assignedRole(request.getAssignedRole())
                .frequency(request.getFrequency() != null ? request.getFrequency() : "DAILY")
                .nextDueDate(request.getNextDueDate() != null ? request.getNextDueDate() : OffsetDateTime.now())
                .status("SCHEDULED")
                .isActive(true)
                .build();

        schedule = scheduleRepository.save(schedule);

        // Notify factory or assigned user
        String targetName = getTargetName(op, gm, mm);
        NotificationMessage msg = NotificationMessage.builder()
                .title("New Audit Scheduled")
                .message(qs.getName() + " scheduled for " + targetName)
                .type("info")
                .eventType("LPA_SCHEDULED")
                .build();
        if (assignedTo != null) {
            notificationService.notifyUser(assignedTo.getId(), msg);
        } else {
            notificationService.notifyFactory(factoryId, "po-updates", msg);
        }

        return schedule;
    }

    public List<LpaSchedule> getSchedules(UUID factoryId, LpaAuditType auditType) {
        if (auditType != null) {
            return scheduleRepository.findByFactoryIdAndAuditTypeAndIsActiveTrue(factoryId, auditType);
        }
        return scheduleRepository.findByFactoryIdAndIsActiveTrueOrderByNextDueDateAsc(factoryId);
    }

    public List<LpaAuditLog> getAuditLogs(UUID factoryId, LpaAuditType auditType) {
        if (auditType != null) {
            return auditLogRepository.findByFactoryIdAndAuditTypeOrderByAuditDateDesc(factoryId, auditType);
        }
        return auditLogRepository.findByFactoryIdOrderByAuditDateDesc(factoryId);
    }

    @Transactional
    public LpaAuditLog submitAudit(UUID factoryId, UUID userId, SubmitLpaAuditRequest request) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new RuntimeException("Factory not found"));
        User auditedBy = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        LpaQuestionSet qs = questionSetRepository.findById(request.getQuestionSetId())
                .orElseThrow(() -> new RuntimeException("Question set not found"));

        LpaSchedule schedule = request.getScheduleId() != null ?
                scheduleRepository.findById(request.getScheduleId()).orElse(null) : null;

        OperationMaster op = request.getOperationMasterId() != null ?
                operationMasterRepository.findById(request.getOperationMasterId()).orElse(null) : (schedule != null ? schedule.getOperationMaster() : qs.getOperationMaster());
        GaugeMaster gm = request.getGaugeMasterId() != null ?
                gaugeMasterRepository.findById(request.getGaugeMasterId()).orElse(null) : (schedule != null ? schedule.getGaugeMaster() : qs.getGaugeMaster());
        MachineMaster mm = request.getMachineMasterId() != null ?
                machineMasterRepository.findById(request.getMachineMasterId()).orElse(null) : (schedule != null ? schedule.getMachineMaster() : qs.getMachineMaster());

        int total = 0;
        int conforming = 0;
        int nonConforming = 0;
        int na = 0;
        boolean criticalFailed = false;

        List<LpaAuditLogAnswer> answerList = new ArrayList<>();
        for (SubmitLpaAuditRequest.AnswerItem item : request.getAnswers()) {
            LpaQuestion q = questionRepository.findById(item.getQuestionId()).orElse(null);
            String qText = q != null ? q.getQuestionText() : "Question";
            int seq = q != null ? q.getSequenceOrder() : 0;
            boolean isCrit = q != null && Boolean.TRUE.equals(q.getIsCritical());

            total++;
            if ("CONFORMING".equalsIgnoreCase(item.getStatus())) {
                conforming++;
            } else if ("NON_CONFORMING".equalsIgnoreCase(item.getStatus())) {
                nonConforming++;
                if (isCrit) criticalFailed = true;
            } else {
                na++;
            }

            LpaAuditLogAnswer ans = LpaAuditLogAnswer.builder()
                    .questionId(item.getQuestionId())
                    .questionText(qText)
                    .sequenceOrder(seq)
                    .isCritical(isCrit)
                    .status(item.getStatus() != null ? item.getStatus().toUpperCase() : "CONFORMING")
                    .actualValue(item.getActualValue())
                    .remarks(item.getRemarks())
                    .correctiveAction(item.getCorrectiveAction())
                    .assignedActionOwner(item.getAssignedActionOwner())
                    .actionStatus("NON_CONFORMING".equalsIgnoreCase(item.getStatus()) ? "OPEN" : "CLOSED")
                    .build();
            answerList.add(ans);
        }

        int validQuestions = total - na;
        BigDecimal score = BigDecimal.ZERO;
        if (validQuestions > 0) {
            score = BigDecimal.valueOf(conforming)
                    .divide(BigDecimal.valueOf(validQuestions), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        } else if (total > 0 && na == total) {
            score = BigDecimal.valueOf(100);
        }

        String overallStatus = "PASS";
        if (nonConforming > 0 || criticalFailed) {
            overallStatus = "FAIL";
        }

        LpaAuditLog logEntity = LpaAuditLog.builder()
                .factory(factory)
                .auditType(request.getAuditType())
                .questionSet(qs)
                .schedule(schedule)
                .operationMaster(op)
                .gaugeMaster(gm)
                .machineMaster(mm)
                .auditedBy(auditedBy)
                .shiftName(request.getShiftName())
                .auditDate(OffsetDateTime.now())
                .scorePercentage(score)
                .totalQuestions(total)
                .conformingCount(conforming)
                .nonConformingCount(nonConforming)
                .naCount(na)
                .overallStatus(overallStatus)
                .remarks(request.getRemarks())
                .build();

        logEntity = auditLogRepository.save(logEntity);

        for (LpaAuditLogAnswer a : answerList) {
            a.setAuditLog(logEntity);
            answerRepository.save(a);
        }

        // Update schedule if present
        if (schedule != null) {
            schedule.setStatus("COMPLETED");
            schedule.setLastCompletedAt(OffsetDateTime.now());
            schedule.setLastScorePercentage(score);

            OffsetDateTime nextDue = schedule.getNextDueDate();
            if (nextDue == null) nextDue = OffsetDateTime.now();
            String freq = schedule.getFrequency() != null ? schedule.getFrequency().toUpperCase() : "DAILY";
            switch (freq) {
                case "WEEKLY":
                    nextDue = nextDue.plusWeeks(1);
                    break;
                case "MONTHLY":
                    nextDue = nextDue.plusMonths(1);
                    break;
                case "SHIFT_WISE":
                    nextDue = nextDue.plusHours(8);
                    break;
                default:
                    nextDue = nextDue.plusDays(1);
                    break;
            }
            schedule.setNextDueDate(nextDue);
            schedule.setStatus("SCHEDULED");
            scheduleRepository.save(schedule);
        }

        // Send STOMP notification for audit completion / defect alert
        String targetName = getTargetName(op, gm, mm);
        if ("FAIL".equals(overallStatus)) {
            NotificationMessage msg = NotificationMessage.builder()
                    .title("Audit Alert: Defect Identified")
                    .message("Non-conformance recorded during " + qs.getName() + " on " + targetName)
                    .type("error")
                    .eventType("LPA_DEFECT")
                    .build();
            notificationService.notifyFactory(factoryId, "po-updates", msg);
        } else {
            NotificationMessage msg = NotificationMessage.builder()
                    .title("Audit Completed")
                    .message(qs.getName() + " completed with " + score + "% score on " + targetName)
                    .type("success")
                    .eventType("LPA_COMPLETED")
                    .build();
            notificationService.notifyFactory(factoryId, "po-updates", msg);
        }

        return logEntity;
    }

    @Transactional(readOnly = true)
    public LpaDashboardSummary getDashboardSummary(UUID factoryId) {
        List<LpaAuditLog> recentLogs = auditLogRepository.findByFactoryIdOrderByAuditDateDesc(factoryId);
        
        long totalCompleted = recentLogs.size();
        long conformingTotal = 0;
        long validQuestionsTotal = 0;
        int perfectStreak = 0;
        boolean streakActive = true;

        for (LpaAuditLog l : recentLogs) {
            if (streakActive) {
                if ("PASS".equalsIgnoreCase(l.getOverallStatus())) {
                    perfectStreak++;
                } else {
                    streakActive = false;
                }
            }
            if (l.getConformingCount() != null && l.getTotalQuestions() != null) {
                int na = l.getNaCount() != null ? l.getNaCount() : 0;
                conformingTotal += l.getConformingCount();
                validQuestionsTotal += (l.getTotalQuestions() - na);
            }
        }

        BigDecimal complianceRate = BigDecimal.valueOf(100);
        if (validQuestionsTotal > 0) {
            complianceRate = BigDecimal.valueOf(conformingTotal)
                    .divide(BigDecimal.valueOf(validQuestionsTotal), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);
        }

        OffsetDateTime now = OffsetDateTime.now();
        List<LpaSchedule> allActiveSchedules = scheduleRepository.findByFactoryIdAndIsActiveTrueOrderByNextDueDateAsc(factoryId);
        long dueToday = 0;
        long overdue = 0;

        List<LpaDashboardSummary.ScheduleSummary> dueScheduleSummaries = new ArrayList<>();
        for (LpaSchedule s : allActiveSchedules) {
            if (s.getNextDueDate() != null) {
                if (s.getNextDueDate().isBefore(now)) {
                    overdue++;
                    if ("SCHEDULED".equals(s.getStatus())) {
                        s.setStatus("OVERDUE");
                        scheduleRepository.save(s);
                    }
                } else if (s.getNextDueDate().toLocalDate().equals(now.toLocalDate())) {
                    dueToday++;
                    if ("SCHEDULED".equals(s.getStatus()) && s.getNextDueDate().isBefore(now.plusHours(2))) {
                        s.setStatus("DUE");
                        scheduleRepository.save(s);
                    }
                }
                dueScheduleSummaries.add(LpaDashboardSummary.ScheduleSummary.builder()
                        .id(s.getId())
                        .auditType(s.getAuditType())
                        .questionSetName(s.getQuestionSet() != null ? s.getQuestionSet().getName() : "Checklist")
                        .assignedToName(s.getAssignedTo() != null ? s.getAssignedTo().getFullName() : "Unassigned")
                        .assignedRole(s.getAssignedRole())
                        .frequency(s.getFrequency())
                        .nextDueDate(s.getNextDueDate())
                        .status(s.getStatus())
                        .targetName(getTargetName(s.getOperationMaster(), s.getGaugeMaster(), s.getMachineMaster()))
                        .build());
            }
        }

        long openActionItems = answerRepository.findOpenNonConformingAnswers(factoryId).size();

        // Category breakdown
        List<LpaDashboardSummary.CategoryMetric> catMetrics = new ArrayList<>();
        for (LpaAuditType type : LpaAuditType.values()) {
            List<LpaAuditLog> typeLogs = auditLogRepository.findByFactoryIdAndAuditTypeOrderByAuditDateDesc(factoryId, type);
            long catTotal = typeLogs.size();
            long catConf = 0;
            long catValid = 0;
            for (LpaAuditLog tl : typeLogs) {
                if (tl.getConformingCount() != null && tl.getTotalQuestions() != null) {
                    int na = tl.getNaCount() != null ? tl.getNaCount() : 0;
                    catConf += tl.getConformingCount();
                    catValid += (tl.getTotalQuestions() - na);
                }
            }
            BigDecimal catRate = BigDecimal.valueOf(100);
            if (catValid > 0) {
                catRate = BigDecimal.valueOf(catConf)
                        .divide(BigDecimal.valueOf(catValid), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(1, RoundingMode.HALF_UP);
            }
            catMetrics.add(LpaDashboardSummary.CategoryMetric.builder()
                    .auditType(type)
                    .totalCompleted(catTotal)
                    .complianceRate(catRate)
                    .build());
        }

        List<LpaDashboardSummary.AuditLogSummary> recentSummaries = recentLogs.stream().limit(10).map(l ->
                LpaDashboardSummary.AuditLogSummary.builder()
                        .id(l.getId())
                        .auditType(l.getAuditType())
                        .questionSetName(l.getQuestionSet() != null ? l.getQuestionSet().getName() : "Checklist")
                        .auditedByName(l.getAuditedBy() != null ? l.getAuditedBy().getFullName() : "Unknown")
                        .shiftName(l.getShiftName())
                        .auditDate(l.getAuditDate())
                        .scorePercentage(l.getScorePercentage())
                        .overallStatus(l.getOverallStatus())
                        .targetName(getTargetName(l.getOperationMaster(), l.getGaugeMaster(), l.getMachineMaster()))
                        .build()
        ).collect(Collectors.toList());

        return LpaDashboardSummary.builder()
                .complianceRate(complianceRate)
                .perfectStreak(perfectStreak)
                .totalAuditsCompleted(totalCompleted)
                .dueTodayCount(dueToday)
                .overdueCount(overdue)
                .openActionItemsCount(openActionItems)
                .categoryMetrics(catMetrics)
                .recentAudits(recentSummaries)
                .dueSchedules(dueScheduleSummaries)
                .build();
    }

    private String getTargetName(OperationMaster op, GaugeMaster gm, MachineMaster mm) {
        List<String> names = new ArrayList<>();
        if (op != null) names.add("Op: " + op.getOperationName());
        if (mm != null) names.add("Mch: " + mm.getMachineName());
        if (gm != null) names.add("Part: " + gm.getGaugeTypeName());
        return names.isEmpty() ? "Plant-Wide / General" : String.join(" | ", names);
    }
}
