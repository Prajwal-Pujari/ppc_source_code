package com.mes.factory.service;

import com.mes.factory.dto.request.CreateQuestionSetRequest;
import com.mes.factory.dto.request.MachineSetupLogRequest;
import com.mes.factory.dto.response.SetupReportDto;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.exception.BusinessException;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.io.InputStream;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.*;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class MachineSetupService {

    private final MachineSetupQuestionSetRepository questionSetRepository;
    private final MachineSetupLogRepository logRepository;
    private final PoLineItemOperationRepository poLineItemOperationRepository;
    private final MachineMasterRepository machineMasterRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final GaugeMasterRepository gaugeMasterRepository;
    private final UserRepository userRepository;
    private final GaugeRepository gaugeRepository;

    @Transactional(readOnly = true)
    public MachineSetupQuestionSet getQuestionSetById(UUID id) {
        return questionSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MachineSetupQuestionSet", "id", id));
    }

    @Transactional(readOnly = true)
    public List<MachineSetupQuestionSet> getAllQuestionSets() {
        return questionSetRepository.findAllWithRelations();
    }

    @Transactional(readOnly = true)
    public Optional<MachineSetupQuestionSet> getForMachine(UUID machineMasterId, UUID operationMasterId, UUID gaugeMasterId) {
        List<MachineSetupQuestionSet> sets = questionSetRepository.findConfig(machineMasterId, operationMasterId, gaugeMasterId);
        if (!sets.isEmpty()) {
            return Optional.of(sets.get(0));
        }
        return Optional.empty();
    }

    @Transactional
    public MachineSetupQuestionSet createQuestionSet(UUID userId, com.mes.factory.dto.request.CreateMachineSetupConfig request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        MachineMaster machineMaster = machineMasterRepository.findById(request.getMachineMasterId())
                .orElseThrow(() -> new ResourceNotFoundException("MachineMaster", "id", request.getMachineMasterId()));

        OperationMaster operationMaster = operationMasterRepository.findById(request.getOperationMasterId())
                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", request.getOperationMasterId()));

        GaugeMaster gaugeMaster = null;
        if (request.getGaugeMasterId() != null) {
            gaugeMaster = gaugeMasterRepository.findById(request.getGaugeMasterId())
                    .orElse(null);
        }

        MachineSetupQuestionSet set = MachineSetupQuestionSet.builder()
                .machineMaster(machineMaster)
                .operationMaster(operationMaster)
                .gaugeMaster(gaugeMaster)
                .factory(user.getFactory())
                .name(request.getName())
                .createdBy(user)
                .build();

        if (request.getQuestions() != null) {
            List<MachineSetupQuestion> questions = new ArrayList<>();
            int seq = 1;
            for (com.mes.factory.dto.request.CreateMachineSetupConfig.QuestionItem item : request.getQuestions()) {
                MachineSetupQuestion q = MachineSetupQuestion.builder()
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
                        .checkingMethod(item.getCheckingMethod() != null ? item.getCheckingMethod() : "Manual")
                        .build();
                questions.add(q);
                seq++;
            }
            set.setQuestions(questions);
        }

        return questionSetRepository.save(set);
    }

    @Transactional
    public MachineSetupQuestionSet updateQuestionSet(UUID userId, UUID id, com.mes.factory.dto.request.CreateMachineSetupConfig request) {
        MachineSetupQuestionSet set = questionSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MachineSetupQuestionSet", "id", id));
        
        OperationMaster operationMaster = operationMasterRepository.findById(request.getOperationMasterId())
                .orElseThrow(() -> new ResourceNotFoundException("OperationMaster", "id", request.getOperationMasterId()));

        GaugeMaster gaugeMaster = null;
        if (request.getGaugeMasterId() != null) {
            gaugeMaster = gaugeMasterRepository.findById(request.getGaugeMasterId()).orElse(null);
        }

        set.setName(request.getName());
        set.setOperationMaster(operationMaster);
        set.setGaugeMaster(gaugeMaster);
        
        if (request.getQuestions() != null) {
            set.getQuestions().clear();
            int seq = 1;
            for (com.mes.factory.dto.request.CreateMachineSetupConfig.QuestionItem item : request.getQuestions()) {
                MachineSetupQuestion q = MachineSetupQuestion.builder()
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
                        .checkingMethod(item.getCheckingMethod() != null ? item.getCheckingMethod() : "Manual")
                        .build();
                set.getQuestions().add(q);
                seq++;
            }
        }
        return questionSetRepository.save(set);
    }

    @Transactional
    public void deleteQuestionSet(UUID id) {
        if (!questionSetRepository.existsById(id)) {
            throw new ResourceNotFoundException("MachineSetupQuestionSet", "id", id);
        }
        questionSetRepository.deleteById(id);
    }

    @Transactional
    public MachineSetupLog submitSetupLog(UUID workerId, MachineSetupLogRequest request) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", workerId));

        PoLineItemOperation poOp = poLineItemOperationRepository.findById(request.getPoLineItemOperationId())
                .orElseThrow(() -> new ResourceNotFoundException("PoLineItemOperation", "id", request.getPoLineItemOperationId()));

        if (request.getQuestionSetId() == null) {
            poOp.setSetupStatus("COMPLETED");
            poOp.setSetupCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
            poOp.setSetupCompletedBy(worker);
            poLineItemOperationRepository.save(poOp);
            return null;
        }

        MachineSetupQuestionSet qSet = questionSetRepository.findById(request.getQuestionSetId())
                .orElseThrow(() -> new ResourceNotFoundException("MachineSetupQuestionSet", "id", request.getQuestionSetId()));

        MachineSetupLog logEntry = MachineSetupLog.builder()
                .factory(worker.getFactory())
                .poLineItemOperation(poOp)
                .questionSet(qSet)
                .worker(worker)
                .logTime(OffsetDateTime.now(ZoneOffset.UTC))
                .remarks(request.getRemarks())
                .isPassed(true) // We assume it passed if they submitted it, or evaluate answers
                .build();

        boolean allPassed = true;
        for (MachineSetupLogRequest.Answer ans : request.getAnswers()) {
            MachineSetupQuestion question = qSet.getQuestions().stream()
                    .filter(q -> q.getId().equals(ans.getQuestionId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Question not found in set", "INVALID_QUESTION"));

            boolean isCompliant = evaluateAnswer(question, ans.getAnswerValue());
            if (!isCompliant && question.getIsCritical()) {
                allPassed = false;
            }

            MachineSetupLogAnswer logAnswer = MachineSetupLogAnswer.builder()
                    .machineSetupLog(logEntry)
                    .question(question)
                    .answerValue(ans.getAnswerValue())
                    .isCompliant(isCompliant)
                    .build();
            logEntry.getAnswers().add(logAnswer);
        }

        logEntry.setIsPassed(allPassed);
        MachineSetupLog savedLog = logRepository.save(logEntry);

        if (allPassed) {
            poOp.setSetupStatus("COMPLETED");
            poOp.setSetupCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
            poOp.setSetupCompletedBy(worker);
            poLineItemOperationRepository.save(poOp);
        }

        return savedLog;
    }

    @Transactional(readOnly = true)
    public SetupReportDto generateSetupReport(UUID gaugeId) {
        Gauge gauge = gaugeRepository.findById(gaugeId)
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", gaugeId));

        PurchaseOrder po = gauge.getPurchaseOrder();

        SetupReportDto.SetupReportDtoBuilder builder = SetupReportDto.builder()
                .poId(po.getId())
                .poNumber(po.getPoNumber())
                .customerName(po.getCustomer() != null ? po.getCustomer().getName() : "Internal")
                .gaugeId(gauge.getId())
                .serialNumber(gauge.getSerialNumber())
                .partName(gauge.getGaugeMaster() != null ? gauge.getGaugeMaster().getGaugeTypeName() : gauge.getGaugeTypeName())
                .targetQuantity(gauge.getBatchQuantity() != null ? gauge.getBatchQuantity() : 0)
                .generatedAt(OffsetDateTime.now())
                .customerLogo(gauge.getCustomerLogo())
                .docNo(gauge.getDocNo())
                .revNo(gauge.getRevNo())
                .issueDate(gauge.getIssueDate());

        List<MachineSetupLog> logs = logRepository.findByGaugeId(gaugeId);
        List<SetupReportDto.SetupLogDto> logDtos = new ArrayList<>();

        for (MachineSetupLog log : logs) {
            List<SetupReportDto.SetupAnswerDto> ansDtos = log.getAnswers().stream().map(a -> 
                SetupReportDto.SetupAnswerDto.builder()
                    .questionText(a.getQuestion().getQuestionText())
                    .questionType(a.getQuestion().getQuestionType().name())
                    .expectedAnswer(a.getQuestion().getExpectedAnswer())
                    .minValue(a.getQuestion().getMinValue() != null ? a.getQuestion().getMinValue().doubleValue() : null)
                    .maxValue(a.getQuestion().getMaxValue() != null ? a.getQuestion().getMaxValue().doubleValue() : null)
                    .unit(a.getQuestion().getUnit())
                    .answerValue(a.getAnswerValue())
                    .build()
            ).collect(Collectors.toList());

            logDtos.add(SetupReportDto.SetupLogDto.builder()
                    .logId(log.getId())
                    .logTime(log.getLogTime())
                    .workerName(log.getWorker() != null ? log.getWorker().getFullName() : "Unknown")
                    .operationName(log.getPoLineItemOperation() != null && log.getPoLineItemOperation().getOperationMaster() != null ? log.getPoLineItemOperation().getOperationMaster().getOperationName() : "Unknown")
                    .machineName(log.getPoLineItemOperation() != null && log.getPoLineItemOperation().getMachineMaster() != null ? log.getPoLineItemOperation().getMachineMaster().getMachineName() : "Unknown")
                    .remarks(log.getRemarks())
                    .isPassed(log.getIsPassed())
                    .answers(ansDtos)
                    .build());
        }

        builder.logs(logDtos);
        return builder.build();
    }

    private boolean evaluateAnswer(MachineSetupQuestion q, String val) {
        if (val == null || val.isBlank()) return false;
        try {
            switch (q.getQuestionType()) {
                case PASS_FAIL:
                    return Boolean.parseBoolean(val) == Boolean.parseBoolean(q.getExpectedAnswer());
                case NUMERIC:
                    double v = Double.parseDouble(val);
                    if (q.getMinValue() != null && v < q.getMinValue().doubleValue()) return false;
                    if (q.getMaxValue() != null && v > q.getMaxValue().doubleValue()) return false;
                    return true;
                case CHOICE:
                case TEXT:
                default:
                    if (q.getExpectedAnswer() != null && !q.getExpectedAnswer().isBlank()) {
                        return val.equalsIgnoreCase(q.getExpectedAnswer());
                    }
                    return true;
            }
        } catch (Exception e) {
            log.error("Failed to evaluate answer for question {}", q.getId(), e);
            return false;
        }
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    double val = cell.getNumericCellValue();
                    if (val == (long) val) {
                        return String.format("%d", (long) val);
                    } else {
                        return String.format("%s", val);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return "";
        }
    }

    @Transactional
    public Map<String, Object> importFromExcel(UUID machineId, UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Factory factory = user.getFactory();
        if (factory == null) {
            throw new IllegalArgumentException("User does not have an assigned factory.");
        }

        MachineMaster machineMaster = machineMasterRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException("MachineMaster", "id", machineId));

        int questionSetsCreated = 0;
        int questionsCreated = 0;
        int skippedSets = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String partNo = "";
                
                OperationMaster currentOpMaster = null;
                MachineSetupQuestionSet currentSet = null;
                int currentSeq = 1;

                for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    String colB = getCellString(row.getCell(1)); // Part No
                    String colC = getCellString(row.getCell(2)); // Operation Sq. No.
                    String colD = getCellString(row.getCell(3)); // Parameter (Question Text)
                    String colE = getCellString(row.getCell(4)); // MIN
                    String colF = getCellString(row.getCell(5)); // MAX
                    String colG = getCellString(row.getCell(6)); // Type (Optional override)

                    if (!colB.isEmpty() && !colB.equalsIgnoreCase("Part No.") && !colB.equalsIgnoreCase("Part No")) {
                        partNo = colB;
                    }

                    if (!colC.isEmpty() && !colC.equalsIgnoreCase("Operation Sq. No.") && !colC.equalsIgnoreCase("Operation Sq. No")) {
                        String opName = colC;
                        String tempCode = opName.split("/")[0].trim().toUpperCase();
                        if (tempCode.length() > 50) tempCode = tempCode.substring(0, 50);
                        
                        final String finalOpName = opName;
                        final String finalOpCode = tempCode;

                        GaugeMaster gaugeMaster = null;
                        if (!partNo.isEmpty()) {
                            final String pNo = partNo;
                            gaugeMaster = gaugeMasterRepository.findFirstByFactoryIdAndCategoryCodeAndIsActiveTrue(factory.getId(), pNo)
                                .orElseGet(() -> {
                                    GaugeMaster gm = GaugeMaster.builder()
                                        .factory(factory)
                                        .categoryCode(pNo)
                                        .gaugeTypeName(pNo)
                                        .isActive(true)
                                        .build();
                                    return gaugeMasterRepository.save(gm);
                                });
                        }

                        currentOpMaster = operationMasterRepository.findFirstByFactoryIdAndOperationCodeAndIsActiveTrue(factory.getId(), finalOpCode)
                                .orElseGet(() -> {
                                    OperationMaster om = OperationMaster.builder()
                                        .factory(factory)
                                        .operationCode(finalOpCode)
                                        .operationName(finalOpName)
                                        .isActive(true)
                                        .build();
                                    return operationMasterRepository.save(om);
                                });

                        // Deactivate old checklists
                        List<MachineSetupQuestionSet> existingSets = questionSetRepository.findConfig(machineMaster.getId(), currentOpMaster.getId(), gaugeMaster != null ? gaugeMaster.getId() : null);
                        for (MachineSetupQuestionSet es : existingSets) {
                            es.setIsActive(false);
                            questionSetRepository.save(es);
                        }

                        // Create new checklist
                        String setName = "Setup Config for " + machineMaster.getMachineCode() + " - " + currentOpMaster.getOperationCode() + (gaugeMaster != null ? " (" + gaugeMaster.getCategoryCode() + ")" : "");
                        currentSet = MachineSetupQuestionSet.builder()
                            .machineMaster(machineMaster)
                            .operationMaster(currentOpMaster)
                            .gaugeMaster(gaugeMaster)
                            .factory(factory)
                            .name(setName)
                            .isActive(true)
                            .createdBy(user)
                            .build();
                        currentSet = questionSetRepository.save(currentSet);
                        questionSetsCreated++;
                        currentSeq = 1;
                    }

                    if (!colD.isEmpty() && !colD.equalsIgnoreCase("Parameter") && !colD.equalsIgnoreCase("Description") && currentSet != null) {
                        QuestionType type = QuestionType.PASS_FAIL;
                        
                        if (colG.equalsIgnoreCase("TEXT") || colG.equalsIgnoreCase("STRING")) {
                            type = QuestionType.TEXT;
                        } else if (colG.equalsIgnoreCase("CHOICE") || colG.equalsIgnoreCase("DROPDOWN")) {
                            type = QuestionType.CHOICE;
                        } else if (colG.equalsIgnoreCase("NUMERIC") || colG.equalsIgnoreCase("NUMBER")) {
                            type = QuestionType.NUMERIC;
                        } else if (colG.equalsIgnoreCase("PASS_FAIL") || colG.equalsIgnoreCase("PASS/FAIL") || colG.equalsIgnoreCase("BOOLEAN")) {
                            type = QuestionType.PASS_FAIL;
                        } else if (!colE.isEmpty() || !colF.isEmpty()) {
                            type = QuestionType.NUMERIC;
                        }

                        BigDecimal minVal = null;
                        BigDecimal maxVal = null;
                        
                        try {
                            if (!colE.isEmpty()) { minVal = new BigDecimal(colE.replaceAll("[^0-9.-]", "")); }
                        } catch (Exception ignored) {}
                        try {
                            if (!colF.isEmpty()) { maxVal = new BigDecimal(colF.replaceAll("[^0-9.-]", "")); }
                        } catch (Exception ignored) {}

                        MachineSetupQuestion q = MachineSetupQuestion.builder()
                                .questionSet(currentSet)
                                .sequenceOrder(currentSeq++)
                                .questionText(colD)
                                .questionType(type)
                                .minValue(minVal)
                                .maxValue(maxVal)
                                .isCritical(colD.toLowerCase().contains("critical") || colD.toLowerCase().contains("*"))
                                .build();
                        currentSet.getQuestions().add(q);
                        questionsCreated++;
                        questionSetRepository.save(currentSet);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Machine Setup excel", e);
            throw new BusinessException("Failed to process Excel file: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("questionSetsCreated", questionSetsCreated);
        result.put("questionsCreated", questionsCreated);
        result.put("skippedSets", skippedSets);
        return result;
    }
}
