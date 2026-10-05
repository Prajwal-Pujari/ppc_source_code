package com.mes.factory.service;

import com.mes.factory.dto.request.CreateLpaQuestionSetRequest;
import com.mes.factory.entity.postgres.QuestionType;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class LpaExcelHelper {

    public List<CreateLpaQuestionSetRequest> parseExcel(MultipartFile file, String auditType) {
        List<CreateLpaQuestionSetRequest> requests = new ArrayList<>();
        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String sheetName = sheet.getSheetName().trim();
                
                // Group by "PartNo_PartName_OperationName"
                Map<String, CreateLpaQuestionSetRequest> setMap = new LinkedHashMap<>();

                String currentPartNo = "";
                String currentPartName = sheetName;
                String currentOperationName = "";

                // Find column indexes dynamically
                Row headerRow = sheet.getRow(0);
                if (headerRow == null) continue;
                
                int partNoIdx = -1, partNameIdx = -1, opIdx = -1, paramIdx = -1, minIdx = -1, maxIdx = -1, methodIdx = -1;
                for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                    String h = getCellString(headerRow.getCell(c)).toLowerCase().trim();
                    if (h.contains("part no")) partNoIdx = c;
                    else if (h.contains("part name")) partNameIdx = c;
                    else if (h.contains("operation")) opIdx = c;
                    else if (h.contains("parameter") || h.contains("question")) paramIdx = c;
                    else if (h.contains("min") || h.contains("target")) minIdx = c;
                    else if (h.contains("max")) maxIdx = c;
                    else if (h.contains("method") || h.contains("inspection")) methodIdx = c;
                }
                
                // Fallbacks if not found (matching original hardcoded format)
                if (partNoIdx == -1) partNoIdx = 1;
                if (partNameIdx == -1) partNameIdx = 2;
                if (opIdx == -1) opIdx = 4;
                if (paramIdx == -1) paramIdx = 5;
                if (minIdx == -1) minIdx = 6;
                if (maxIdx == -1) maxIdx = 7;
                if (methodIdx == -1) methodIdx = 8;

                int seq = 1;
                for (int r = 1; r <= sheet.getLastRowNum(); r++) { // Skip header row 0 unconditionally
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    String colB = getCellString(row.getCell(partNoIdx)); // Part No
                    String colC = getCellString(row.getCell(partNameIdx)); // Part Name
                    String colE = getCellString(row.getCell(opIdx)); // Operation Sq. No. / Name
                    String colF = getCellString(row.getCell(paramIdx)); // Parameter (Question Text)
                    String colG = getCellString(row.getCell(minIdx)); // MIN
                    String colH = getCellString(row.getCell(maxIdx)); // MAX
                    String colI = getCellString(row.getCell(methodIdx)); // Inspection Method

                    if (!colB.isEmpty() && !colB.equalsIgnoreCase("Part No.") && !colB.equalsIgnoreCase("Part No")) {
                        currentPartNo = colB;
                    }
                    if (!colC.isEmpty() && !colC.equalsIgnoreCase("Part Name")) {
                        currentPartName = colC;
                    }
                    if (!colE.isEmpty() && !colE.equalsIgnoreCase("Operation Sq. No.") && !colE.equalsIgnoreCase("Operation Sq. No")) {
                        currentOperationName = colE;
                        seq = 1; // Reset sequence for new operation
                    }

                    if (colF.isEmpty() || colF.equalsIgnoreCase("Parameter") || colF.equalsIgnoreCase("Question")) continue;

                    String key = currentPartNo + "_" + currentPartName + "_" + currentOperationName;
                    
                    final String finalPartNo = currentPartNo;
                    final String finalPartName = currentPartName;
                    final String finalOperationName = currentOperationName;
                    
                    CreateLpaQuestionSetRequest req = setMap.computeIfAbsent(key, k -> {
                        CreateLpaQuestionSetRequest newReq = new CreateLpaQuestionSetRequest();
                        String setName = (finalPartNo.isEmpty() ? "" : "[" + finalPartNo + "] ") + finalPartName + 
                                         (finalOperationName.isEmpty() ? "" : " - " + finalOperationName);
                        if (setName.length() > 255) setName = setName.substring(0, 255);
                        
                        newReq.setName(setName);
                        newReq.setDescription("Imported from Excel");
                        newReq.setAuditType(com.mes.factory.entity.postgres.LpaAuditType.valueOf(auditType));
                        newReq.setDefaultFrequency("DAILY");
                        newReq.setImportedPartNo(finalPartNo);
                        newReq.setImportedPartName(finalPartName);
                        newReq.setImportedOperationName(finalOperationName);
                        newReq.setQuestions(new ArrayList<>());
                        return newReq;
                    });

                    CreateLpaQuestionSetRequest.QuestionItem qi = new CreateLpaQuestionSetRequest.QuestionItem();
                    qi.setSequenceOrder(seq++);
                    qi.setQuestionText(colF);
                    
                    String qTypeStr = "TEXT";
                    String expectedAns = colG + (colH.isEmpty() || colH.equals("-") ? "" : " / " + colH);
                    BigDecimal minVal = null;
                    BigDecimal maxVal = null;
                    
                    try {
                        String cleanMin = colG.replaceAll("[^0-9.-]", "");
                        String cleanMax = colH.replaceAll("[^0-9.-]", "");
                        if (!cleanMin.isEmpty() && !cleanMax.isEmpty() && !colG.contains("Ra") && !colH.contains("Ra")) {
                            minVal = new BigDecimal(cleanMin);
                            maxVal = new BigDecimal(cleanMax);
                            qTypeStr = "NUMERIC";
                        }
                    } catch (Exception ignored) {}

                    if (qTypeStr.equals("TEXT") && (colG.equalsIgnoreCase("PASS") || colG.equalsIgnoreCase("OK") || colG.equalsIgnoreCase("FAIL"))) {
                        qTypeStr = "PASS_FAIL";
                        expectedAns = "PASS";
                    } else if (qTypeStr.equals("TEXT") && (colG.equalsIgnoreCase("YES") || colG.equalsIgnoreCase("NO"))) {
                        qTypeStr = "YES_NO";
                        expectedAns = "YES";
                    }

                    qi.setQuestionType(qTypeStr);
                    qi.setExpectedAnswer(expectedAns);
                    qi.setMinValue(minVal);
                    qi.setMaxValue(maxVal);
                    qi.setCheckingMethod(colI.isEmpty() ? "Visual" : colI);
                    qi.setIsCritical(false);
                    
                    req.getQuestions().add(qi);
                }
                requests.addAll(setMap.values());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Excel file: " + e.getMessage());
        }
        return requests;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell).trim();
    }
}
