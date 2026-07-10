package com.mes.factory.service;

import com.mes.factory.dto.request.CreateQuestionSetRequest;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.*;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PqcQuestionSetService {

    private final PqcQuestionSetRepository questionSetRepository;
    private final PqcQuestionRepository questionRepository;
    private final OperationMasterRepository operationMasterRepository;
    private final GaugeMasterRepository gaugeMasterRepository;
    private final UserRepository userRepository;

    public PqcQuestionSetService(PqcQuestionSetRepository questionSetRepository,
                                  PqcQuestionRepository questionRepository,
                                  OperationMasterRepository operationMasterRepository,
                                  GaugeMasterRepository gaugeMasterRepository,
                                  UserRepository userRepository) {
        this.questionSetRepository = questionSetRepository;
        this.questionRepository = questionRepository;
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
                        .checkingMethod(item.getCheckingMethod() != null ? item.getCheckingMethod() : "D.V.C")
                        .showInPdir(item.getShowInPdir() != null ? item.getShowInPdir() : true)
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
                        .checkingMethod(item.getCheckingMethod() != null ? item.getCheckingMethod() : "D.V.C")
                        .showInPdir(item.getShowInPdir() != null ? item.getShowInPdir() : true)
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

    @Transactional
    public Map<String, Object> importFromExcel(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Factory factory = user.getFactory();
        if (factory == null) {
            throw new IllegalArgumentException("User does not have an assigned factory.");
        }

        int questionSetsCreated = 0;
        int questionsCreated = 0;
        int operationsCreated = 0;
        int gaugesCreated = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String sheetName = sheet.getSheetName().trim();
                String partNo = "";
                String partName = sheetName;

                OperationMaster currentOpMaster = null;
                PqcQuestionSet currentSet = null;
                int currentSeq = 1;

                for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    String colB = getCellString(row.getCell(1)); // Part No
                    String colC = getCellString(row.getCell(2)); // Part Name
                    String colD = getCellString(row.getCell(3)); // Operation Sq. No.
                    String colE = getCellString(row.getCell(4)); // Parameter
                    String colF = getCellString(row.getCell(5)); // MIN
                    String colG = getCellString(row.getCell(6)); // MAX
                    String colH = getCellString(row.getCell(7)); // Inspection Method

                    if (!colB.isEmpty() && !colB.equalsIgnoreCase("Part No.") && !colB.equalsIgnoreCase("Part No")) {
                        partNo = colB;
                    }
                    if (!colC.isEmpty() && !colC.equalsIgnoreCase("Part Name")) {
                        partName = colC;
                    }

                    if (!colD.isEmpty() && !colD.equalsIgnoreCase("Operation Sq. No.") && !colD.equalsIgnoreCase("Operation Sq. No")) {
                        String opName = colD;
                        String tempCode = opName.split("/")[0].trim().toUpperCase();
                        if (tempCode.length() > 50) tempCode = tempCode.substring(0, 50);
                        final String finalOpName = opName;
                        final String finalOpCode = tempCode;

                        OperationMaster opMaster = operationMasterRepository.findFirstByFactoryIdAndOperationNameAndIsActiveTrue(factory.getId(), finalOpName)
                                .orElseGet(() -> {
                                    OperationMaster newOp = OperationMaster.builder()
                                            .factory(factory)
                                            .operationName(finalOpName)
                                            .operationCode(finalOpCode)
                                            .department("PQC")
                                            .isActive(true)
                                            .build();
                                    return operationMasterRepository.save(newOp);
                                });
                        if (opMaster.getCreatedAt() == null) {
                            operationsCreated++;
                        }
                        currentOpMaster = opMaster;

                        String setName = (partNo.isEmpty() ? "" : "[" + partNo + "] ") + partName + " - " + currentOpMaster.getOperationName();
                        if (setName.length() > 255) setName = setName.substring(0, 255);

                        PqcQuestionSet set = PqcQuestionSet.builder()
                                .operationMaster(currentOpMaster)
                                .factory(factory)
                                .name(setName)
                                .inspectionFrequency("SHIFT_START")
                                .createdBy(user)
                                .isActive(true)
                                .questions(new ArrayList<>())
                                .build();
                        currentSet = questionSetRepository.save(set);
                        questionSetsCreated++;
                        currentSeq = 1;
                    }

                    if (currentSet != null && !colE.isEmpty() && !colE.equalsIgnoreCase("Parameter")) {
                        GaugeMaster gaugeMaster = null;
                        if (!colH.isEmpty() && !colH.equalsIgnoreCase("Inspection Method") && !colH.equals("-")) {
                            final String finalGaugeName = colH;
                            gaugeMaster = gaugeMasterRepository.findFirstByFactoryIdAndGaugeTypeNameAndIsActiveTrue(factory.getId(), finalGaugeName)
                                    .orElseGet(() -> {
                                        GaugeMaster newGauge = GaugeMaster.builder()
                                                .factory(factory)
                                                .gaugeTypeName(finalGaugeName)
                                                .categoryCode("INSPECTION")
                                                .unitOfMeasurement("mm")
                                                .isActive(true)
                                                .build();
                                        return gaugeMasterRepository.save(newGauge);
                                    });
                            if (gaugeMaster.getCreatedAt() == null) {
                                gaugesCreated++;
                            }
                        }

                        java.math.BigDecimal minVal = null;
                        java.math.BigDecimal maxVal = null;
                        QuestionType qType = QuestionType.TEXT;
                        String expAns = colF + (colG.isEmpty() || colG.equals("-") ? "" : " / " + colG);

                        try {
                            String cleanMin = colF.replaceAll("[^0-9.-]", "");
                            String cleanMax = colG.replaceAll("[^0-9.-]", "");
                            if (!cleanMin.isEmpty() && !cleanMax.isEmpty() && !colF.contains("Ra") && !colG.contains("Ra")) {
                                minVal = new java.math.BigDecimal(cleanMin);
                                maxVal = new java.math.BigDecimal(cleanMax);
                                qType = QuestionType.NUMERIC;
                            }
                        } catch (Exception ex) {
                            qType = QuestionType.TEXT;
                        }

                        if (colE.toLowerCase().contains("chamfer") || colE.toLowerCase().contains("chamfer")) {
                            qType = QuestionType.TEXT;
                        }

                        PqcQuestion q = PqcQuestion.builder()
                                .questionSet(currentSet)
                                .sequenceOrder(currentSeq++)
                                .questionText(colE)
                                .questionType(qType)
                                .expectedAnswer(expAns)
                                .unit(gaugeMaster != null && gaugeMaster.getUnitOfMeasurement() != null ? gaugeMaster.getUnitOfMeasurement() : "mm")
                                .minValue(minVal)
                                .maxValue(maxVal)
                                .isCritical(colE.toLowerCase().contains("dia") || colE.toLowerCase().contains("width"))
                                .checkingMethod(colH.isEmpty() ? "D.V.C" : colH)
                                .showInPdir(true)
                                .build();
                        questionRepository.save(q);
                        questionsCreated++;
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Excel file: " + e.getMessage(), e);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("questionSetsCreated", questionSetsCreated);
        result.put("questionsCreated", questionsCreated);
        result.put("operationsCreated", operationsCreated);
        result.put("gaugesCreated", gaugesCreated);
        return result;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        try {
            if (cell.getCellType() == CellType.STRING) {
                return cell.getStringCellValue().trim();
            } else if (cell.getCellType() == CellType.NUMERIC) {
                double d = cell.getNumericCellValue();
                if (d == (long) d) {
                    return String.format("%d", (long) d);
                } else {
                    return String.valueOf(d);
                }
            } else if (cell.getCellType() == CellType.BOOLEAN) {
                return String.valueOf(cell.getBooleanCellValue());
            } else if (cell.getCellType() == CellType.FORMULA) {
                try {
                    return cell.getStringCellValue().trim();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return "";
    }
}
