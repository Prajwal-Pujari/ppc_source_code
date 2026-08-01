package com.mes.factory.service;

import com.mes.factory.dto.request.CreateQuestionSetRequest;
import com.mes.factory.dto.request.ControlPlanPreviewDTO;
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
    private final GaugeMasterOperationRepository gaugeMasterOperationRepository;
    private final UserRepository userRepository;

    public PqcQuestionSetService(PqcQuestionSetRepository questionSetRepository,
                                  PqcQuestionRepository questionRepository,
                                  OperationMasterRepository operationMasterRepository,
                                  GaugeMasterRepository gaugeMasterRepository,
                                  GaugeMasterOperationRepository gaugeMasterOperationRepository,
                                  UserRepository userRepository) {
        this.questionSetRepository = questionSetRepository;
        this.questionRepository = questionRepository;
        this.operationMasterRepository = operationMasterRepository;
        this.gaugeMasterRepository = gaugeMasterRepository;
        this.gaugeMasterOperationRepository = gaugeMasterOperationRepository;
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
        int skippedSets = 0;

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
                    String colD = getCellString(row.getCell(3)); // Cycle Time
                    String colE = getCellString(row.getCell(4)); // Operation Sq. No.
                    String colF = getCellString(row.getCell(5)); // Parameter
                    String colG = getCellString(row.getCell(6)); // MIN
                    String colH = getCellString(row.getCell(7)); // MAX
                    String colI = getCellString(row.getCell(8)); // Inspection Method

                    if (!colB.isEmpty() && !colB.equalsIgnoreCase("Part No.") && !colB.equalsIgnoreCase("Part No")) {
                        partNo = colB;
                    }
                    if (!colC.isEmpty() && !colC.equalsIgnoreCase("Part Name")) {
                        partName = colC;
                    }

                    if (!colE.isEmpty() && !colE.equalsIgnoreCase("Operation Sq. No.") && !colE.equalsIgnoreCase("Operation Sq. No")) {
                        String opName = colE;
                        String tempCode = opName.split("/")[0].trim().toUpperCase();
                        if (tempCode.length() > 50) tempCode = tempCode.substring(0, 50);
                        final String finalOpName = opName;
                        final String finalOpCode = tempCode;
                        
                        java.math.BigDecimal parsedCycleTime = null;
                        try {
                            if (!colD.isEmpty() && !colD.equalsIgnoreCase("Cycle Time") && !colD.equalsIgnoreCase("Standard Time")) {
                                parsedCycleTime = new java.math.BigDecimal(colD.replaceAll("[^0-9.-]", ""));
                            }
                        } catch (Exception ignored) {}
                        
                        final java.math.BigDecimal finalCycleTimeHours = parsedCycleTime != null ? 
                                parsedCycleTime.divide(new java.math.BigDecimal("60"), 2, java.math.RoundingMode.HALF_UP) : null;

                        final String finalPartName = partName;
                        final String finalPartNo = partNo.isEmpty() ? finalPartName : partNo;
                        GaugeMaster gaugeMaster = null;
                        if (!finalPartNo.isEmpty()) {
                            gaugeMaster = gaugeMasterRepository.findFirstByFactoryIdAndCategoryCodeAndIsActiveTrue(factory.getId(), finalPartNo)
                                .orElseGet(() -> {
                                    GaugeMaster gm = GaugeMaster.builder()
                                        .factory(factory)
                                        .categoryCode(finalPartNo)
                                        .gaugeTypeName(finalPartName)
                                        .isActive(true)
                                        .build();
                                    return gaugeMasterRepository.save(gm);
                                });
                        }
                        final GaugeMaster currentGaugeMaster = gaugeMaster;

                        Optional<OperationMaster> existingOpOpt = operationMasterRepository.findFirstByFactoryIdAndOperationNameAndIsActiveTrue(factory.getId(), finalOpName);
                        
                        OperationMaster opMaster = existingOpOpt.orElseGet(() -> {
                                    OperationMaster newOp = OperationMaster.builder()
                                            .factory(factory)
                                            .operationName(finalOpName)
                                            .operationCode(finalOpCode)
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
                                .gaugeMaster(currentGaugeMaster)
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

                    if (currentSet != null && !colF.isEmpty() && !colF.equalsIgnoreCase("Parameter")) {
                        java.math.BigDecimal minVal = null;
                        java.math.BigDecimal maxVal = null;
                        QuestionType qType = QuestionType.TEXT;
                        String expAns = colG + (colH.isEmpty() || colH.equals("-") ? "" : " / " + colH);

                        try {
                            String cleanMin = colG.replaceAll("[^0-9.-]", "");
                            String cleanMax = colH.replaceAll("[^0-9.-]", "");
                            if (!cleanMin.isEmpty() && !cleanMax.isEmpty() && !colG.contains("Ra") && !colH.contains("Ra")) {
                                minVal = new java.math.BigDecimal(cleanMin);
                                maxVal = new java.math.BigDecimal(cleanMax);
                                qType = QuestionType.NUMERIC;
                            }
                        } catch (Exception ex) {
                            qType = QuestionType.TEXT;
                        }

                        if (colF.toLowerCase().contains("chamfer") || colF.toLowerCase().contains("chamfer")) {
                            qType = QuestionType.TEXT;
                        }

                        PqcQuestion q = PqcQuestion.builder()
                                .questionSet(currentSet)
                                .sequenceOrder(currentSeq++)
                                .questionText(colF)
                                .questionType(qType)
                                .expectedAnswer(expAns)
                                .minValue(minVal)
                                .maxValue(maxVal)
                                .isCritical(colF.toLowerCase().contains("dia") || colF.toLowerCase().contains("width"))
                                .checkingMethod(colI.isEmpty() ? "D.V.C" : colI)
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
        result.put("skippedSets", skippedSets);
        return result;
    }

    @Transactional(readOnly = true)
    public ControlPlanPreviewDTO analyzeExcel(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Factory factory = user.getFactory();
        if (factory == null) {
            throw new IllegalArgumentException("User does not have an assigned factory.");
        }

        List<ControlPlanPreviewDTO.PartPreview> parts = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String sheetName = sheet.getSheetName().trim();
                String partNo = "";
                String partName = sheetName;

                ControlPlanPreviewDTO.PartPreview currentPart = new ControlPlanPreviewDTO.PartPreview();
                currentPart.setPartNo(partNo);
                currentPart.setPartName(partName);
                currentPart.setOperations(new ArrayList<>());
                parts.add(currentPart);

                ControlPlanPreviewDTO.OperationPreview currentOp = null;
                int currentSeq = 1;
                


                for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    String colB = getCellString(row.getCell(1)); // Part No
                    String colC = getCellString(row.getCell(2)); // Part Name
                    String colD = getCellString(row.getCell(3)); // Cycle Time
                    String colE = getCellString(row.getCell(4)); // Operation Sq. No.
                    String colF = getCellString(row.getCell(5)); // Parameter
                    String colG = getCellString(row.getCell(6)); // MIN
                    String colH = getCellString(row.getCell(7)); // MAX
                    String colI = getCellString(row.getCell(8)); // Inspection Method

                    if (!colB.isEmpty() && !colB.equalsIgnoreCase("Part No.") && !colB.equalsIgnoreCase("Part No")) {
                        partNo = colB;
                        currentPart.setPartNo(partNo);
                    }
                    if (!colC.isEmpty() && !colC.equalsIgnoreCase("Part Name")) {
                        partName = colC;
                        currentPart.setPartName(partName);
                    }

                    if (!colE.isEmpty() && !colE.equalsIgnoreCase("Operation Sq. No.") && !colE.equalsIgnoreCase("Operation Sq. No")) {
                        String opName = colE;
                        String tempCode = opName.split("/")[0].trim().toUpperCase();
                        if (tempCode.length() > 50) tempCode = tempCode.substring(0, 50);
                        final String finalOpName = opName;

                        Double parsedCycleTime = null;
                        try {
                            if (!colD.isEmpty() && !colD.equalsIgnoreCase("Cycle Time") && !colD.equalsIgnoreCase("Standard Time")) {
                                parsedCycleTime = Double.parseDouble(colD.replaceAll("[^0-9.-]", ""));
                            }
                        } catch (Exception ignored) {}

                        if (currentOp == null || !currentOp.getOperationName().equals(finalOpName)) {
                            currentOp = new ControlPlanPreviewDTO.OperationPreview();
                            currentOp.setOperationName(finalOpName);
                            currentOp.setOperationCode(tempCode);
                            currentOp.setDepartment("PQC");
                            currentOp.setExistingOperationMasterId(null); // Will be recalculated later
                            currentOp.setCycleTimeMins(parsedCycleTime);
                            currentOp.setQuestions(new ArrayList<>());
                            currentPart.getOperations().add(currentOp);
                            currentSeq = 1;
                        }
                    }

                    if (currentOp != null && !colF.isEmpty() && !colF.equalsIgnoreCase("Parameter")) {
                        Double minVal = null;
                        Double maxVal = null;
                        String qType = "TEXT";
                        String expAns = colG + (colH.isEmpty() || colH.equals("-") ? "" : " / " + colH);

                        try {
                            String cleanMin = colG.replaceAll("[^0-9.-]", "");
                            String cleanMax = colH.replaceAll("[^0-9.-]", "");
                            if (!cleanMin.isEmpty() && !cleanMax.isEmpty() && !colG.contains("Ra") && !colH.contains("Ra")) {
                                minVal = Double.parseDouble(cleanMin);
                                maxVal = Double.parseDouble(cleanMax);
                                qType = "NUMERIC";
                            }
                        } catch (Exception ex) {
                            qType = "TEXT";
                        }

                        if (colF.toLowerCase().contains("chamfer")) {
                            qType = "TEXT";
                        }

                        ControlPlanPreviewDTO.QuestionPreview q = new ControlPlanPreviewDTO.QuestionPreview();
                        q.setSequenceOrder(currentSeq++);
                        q.setQuestionText(colF);
                        q.setQuestionType(qType);
                        q.setExpectedAnswer(expAns);
                        q.setMinValue(minVal);
                        q.setMaxValue(maxVal);
                        q.setCheckingMethod(colI.isEmpty() ? "D.V.C" : colI);
                        q.setIsCritical(colF.toLowerCase().contains("dia") || colF.toLowerCase().contains("width"));
                        currentOp.getQuestions().add(q);
                    }
                }
            }
            
            // Post-process to group parts by partNo and merge operations
            java.util.Map<String, ControlPlanPreviewDTO.PartPreview> mergedParts = new java.util.LinkedHashMap<>();
            for (ControlPlanPreviewDTO.PartPreview p : parts) {
                String key = (p.getPartNo() != null && !p.getPartNo().isEmpty()) ? p.getPartNo() : p.getPartName();
                if (mergedParts.containsKey(key)) {
                    ControlPlanPreviewDTO.PartPreview existing = mergedParts.get(key);
                    // Merge operations
                    for (ControlPlanPreviewDTO.OperationPreview newOp : p.getOperations()) {
                        ControlPlanPreviewDTO.OperationPreview existingOp = existing.getOperations().stream()
                                .filter(o -> o.getOperationName().equals(newOp.getOperationName()))
                                .findFirst()
                                .orElse(null);
                        if (existingOp != null) {
                            existingOp.getQuestions().addAll(newOp.getQuestions());
                        } else {
                            existing.getOperations().add(newOp);
                        }
                    }
                } else {
                    mergedParts.put(key, p);
                }
            }
            List<ControlPlanPreviewDTO.PartPreview> finalParts = new ArrayList<>(mergedParts.values());

            // Post-process to link parts and their specific operations
            for (ControlPlanPreviewDTO.PartPreview p : finalParts) {
                if (p.getPartNo() != null && !p.getPartNo().isEmpty()) {
                    Optional<GaugeMaster> gmOpt = gaugeMasterRepository.findFirstByFactoryIdAndCategoryCodeAndIsActiveTrue(factory.getId(), p.getPartNo());
                    if (gmOpt.isPresent()) {
                        p.setIsExistingPart(true);
                        p.setExistingGaugeMasterId(gmOpt.get().getId());
                        
                        for (ControlPlanPreviewDTO.OperationPreview op : p.getOperations()) {
                            Optional<OperationMaster> omOpt = operationMasterRepository.findFirstByFactoryIdAndOperationCode(factory.getId(), op.getOperationCode());
                            op.setExistingOperationMasterId(omOpt.map(OperationMaster::getId).orElse(null));
                        }
                    } else {
                        p.setIsExistingPart(false);
                        p.setExistingGaugeMasterId(null);
                        for (ControlPlanPreviewDTO.OperationPreview op : p.getOperations()) {
                            op.setExistingOperationMasterId(null);
                        }
                    }
                }
            }
            
            return new ControlPlanPreviewDTO(finalParts);
        } catch (Exception e) {
            throw new RuntimeException("Failed to analyze Excel file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Map<String, Object> commitImport(UUID userId, ControlPlanPreviewDTO previewDto) {
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
        int skippedSets = 0;

        if (previewDto.getParts() != null) {
            for (ControlPlanPreviewDTO.PartPreview partPreview : previewDto.getParts()) {
                String partNo = partPreview.getPartNo() != null ? partPreview.getPartNo().trim() : "";
                String partName = partPreview.getPartName() != null ? partPreview.getPartName().trim() : "";
                
                final String finalPartName = partName;
                final String finalPartNo = partNo.isEmpty() ? finalPartName : partNo;
                
                GaugeMaster gaugeMaster = null;
                if (!finalPartNo.isEmpty()) {
                    gaugeMaster = gaugeMasterRepository.findFirstByFactoryIdAndCategoryCodeAndIsActiveTrue(factory.getId(), finalPartNo)
                        .orElseGet(() -> {
                            GaugeMaster gm = GaugeMaster.builder()
                                .factory(factory)
                                .categoryCode(finalPartNo)
                                .gaugeTypeName(finalPartName)
                                .isActive(true)
                                .build();
                            return gaugeMasterRepository.save(gm);
                        });
                }
                final GaugeMaster currentGaugeMaster = gaugeMaster;

                if (partPreview.getOperations() != null) {
                    for (ControlPlanPreviewDTO.OperationPreview opPreview : partPreview.getOperations()) {
                        String opName = opPreview.getOperationName() != null ? opPreview.getOperationName().trim() : "Operation";
                        String opCode = opPreview.getOperationCode() != null ? opPreview.getOperationCode().trim() : "OP";
                        if (opCode.length() > 50) opCode = opCode.substring(0, 50);

                        final String finalOpName = opName;
                        final String finalOpCode = opCode;
                    
                        java.math.BigDecimal previewTimeHours = opPreview.getCycleTimeMins() != null ? 
                            java.math.BigDecimal.valueOf(opPreview.getCycleTimeMins() / 60.0).setScale(2, java.math.RoundingMode.HALF_UP) : null;

                        OperationMaster currentOpMaster;
                        if (opPreview.getExistingOperationMasterId() != null) {
                            currentOpMaster = operationMasterRepository.findById(opPreview.getExistingOperationMasterId())
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
                        } else {
                            Optional<OperationMaster> existingOpOpt = operationMasterRepository.findFirstByFactoryIdAndOperationCode(factory.getId(), finalOpCode);
                            
                            currentOpMaster = existingOpOpt.orElseGet(() -> {
                                        OperationMaster newOp = OperationMaster.builder()
                                                .factory(factory)
                                                .operationName(finalOpName)
                                                .operationCode(finalOpCode)
                                                .department(opPreview.getDepartment() != null && !opPreview.getDepartment().trim().isEmpty() ? opPreview.getDepartment() : "PQC")
                                                .isActive(true)
                                                .build();
                                        return operationMasterRepository.save(newOp);
                                    });
                        }
                        if (currentOpMaster.getCreatedAt() == null) {
                            operationsCreated++;
                        }
                        
                        java.math.BigDecimal finalCycleTimeMins = opPreview.getCycleTimeMins() != null ? 
                            java.math.BigDecimal.valueOf(opPreview.getCycleTimeMins()).setScale(2, java.math.RoundingMode.HALF_UP) : null;

                        // Link Operation to Gauge if not linked
                        if (currentGaugeMaster != null) {
                            Optional<GaugeMasterOperation> existingLink = gaugeMasterOperationRepository.findFirstByGaugeMasterIdAndOperationMasterId(currentGaugeMaster.getId(), currentOpMaster.getId());
                            if (existingLink.isEmpty()) {
                                int nextSeq = 0;
                                List<GaugeMasterOperation> existingOps = gaugeMasterOperationRepository.findByGaugeMasterIdOrderBySequenceOrder(currentGaugeMaster.getId());
                                if (!existingOps.isEmpty()) {
                                    nextSeq = existingOps.stream().mapToInt(GaugeMasterOperation::getSequenceOrder).max().orElse(-1) + 1;
                                }
                                GaugeMasterOperation newLink = GaugeMasterOperation.builder()
                                    .gaugeMaster(currentGaugeMaster)
                                    .operationMaster(currentOpMaster)
                                    .sequenceOrder(nextSeq)
                                    .cycleTimeMins(finalCycleTimeMins)
                                    .isMandatory(true)
                                    .build();
                                gaugeMasterOperationRepository.saveAndFlush(newLink);
                            } else if (finalCycleTimeMins != null && existingLink.get().getCycleTimeMins() == null) {
                                GaugeMasterOperation link = existingLink.get();
                                link.setCycleTimeMins(finalCycleTimeMins);
                                gaugeMasterOperationRepository.saveAndFlush(link);
                            }
                        }

                        String setName = (partNo.isEmpty() ? "" : "[" + partNo + "] ") + partName + " - " + currentOpMaster.getOperationName();
                        if (setName.length() > 255) setName = setName.substring(0, 255);

                        // AI Verification: Prevent duplicates by skipping if it already exists
                        UUID gaugeId = currentGaugeMaster != null ? currentGaugeMaster.getId() : null;
                        Optional<PqcQuestionSet> existingSetOpt = gaugeId != null 
                            ? questionSetRepository.findFirstByFactoryIdAndGaugeMasterIdAndOperationMasterIdAndNameAndIsActiveTrue(factory.getId(), gaugeId, currentOpMaster.getId(), setName)
                            : Optional.empty();

                        if (existingSetOpt.isPresent()) {
                            // Skip this question set entirely to prevent duplicate data
                            skippedSets++;
                            continue;
                        }

                        PqcQuestionSet set = PqcQuestionSet.builder()
                                .operationMaster(currentOpMaster)
                                .gaugeMaster(currentGaugeMaster)
                                .factory(factory)
                                .name(setName)
                                .inspectionFrequency("SHIFT_START")
                                .createdBy(user)
                                .isActive(true)
                                .questions(new ArrayList<>())
                                .build();
                        PqcQuestionSet currentSet = questionSetRepository.save(set);
                        questionSetsCreated++;

                        if (opPreview.getQuestions() != null) {
                            for (ControlPlanPreviewDTO.QuestionPreview qPreview : opPreview.getQuestions()) {
                                String qText = qPreview.getQuestionText() != null ? qPreview.getQuestionText().trim() : "";
                                if (qText.isEmpty()) continue;

                                String method = qPreview.getCheckingMethod() != null ? qPreview.getCheckingMethod().trim() : "D.V.C";
                                
                                QuestionType qType = QuestionType.TEXT;
                                if ("NUMERIC".equalsIgnoreCase(qPreview.getQuestionType())) {
                                    qType = QuestionType.NUMERIC;
                                }

                                java.math.BigDecimal minVal = qPreview.getMinValue() != null ? java.math.BigDecimal.valueOf(qPreview.getMinValue()) : null;
                                java.math.BigDecimal maxVal = qPreview.getMaxValue() != null ? java.math.BigDecimal.valueOf(qPreview.getMaxValue()) : null;

                                PqcQuestion q = PqcQuestion.builder()
                                        .questionSet(currentSet)
                                        .sequenceOrder(qPreview.getSequenceOrder() != null ? qPreview.getSequenceOrder() : 1)
                                        .questionText(qText)
                                        .questionType(qType)
                                        .expectedAnswer(qPreview.getExpectedAnswer())
                                        .checkingMethod(qPreview.getCheckingMethod())
                                        .minValue(qPreview.getMinValue() != null ? new java.math.BigDecimal(qPreview.getMinValue()) : null)
                                        .isCritical(qPreview.getIsCritical() != null && qPreview.getIsCritical())
                                        .checkingMethod(qPreview.getCheckingMethod())
                                        .showInPdir(true)
                                        .build();
                                questionRepository.save(q);
                                questionsCreated++;
                            }
                        }
                    }
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("questionSetsCreated", questionSetsCreated);
        result.put("questionsCreated", questionsCreated);
        result.put("operationsCreated", operationsCreated);
        result.put("gaugesCreated", gaugesCreated);
        result.put("skippedSets", skippedSets);
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
