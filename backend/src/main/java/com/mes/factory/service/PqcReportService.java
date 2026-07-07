package com.mes.factory.service;

import com.mes.factory.dto.response.QualityReportDto;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.PqcInspectionLogRepository;
import com.mes.factory.repository.postgres.PqcQuestionSetRepository;
import com.mes.factory.repository.postgres.ReportConfigurationRepository;
import com.mes.factory.repository.postgres.PqcShiftApprovalRepository;
import com.mes.factory.repository.postgres.PqcQuestionRepository;
import com.mes.factory.entity.postgres.PqcShiftApproval;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PqcReportService {

    private final GaugeRepository gaugeRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final PqcInspectionLogRepository inspectionLogRepository;
    private final PqcQuestionSetRepository questionSetRepository;
    private final ReportConfigurationRepository reportConfigurationRepository;
    private final PqcShiftApprovalRepository approvalRepository;
    private final PqcQuestionRepository questionRepository;

    @Transactional
    public QualityReportDto generateReport(UUID gaugeId, String reportType, UUID shiftId, UUID operationId,
            String filterDate) {
        Gauge gauge = gaugeRepository.findById(gaugeId)
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", gaugeId));

        PurchaseOrder po = gauge.getPurchaseOrder();

        String logo = gauge.getCustomerLogo();
        String docNo = gauge.getDocNo();
        String revNo = gauge.getRevNo();
        String issueDate = gauge.getIssueDate();

        if (logo == null && docNo == null && revNo == null && issueDate == null && gauge.getFactory() != null) {
            ReportConfiguration rc = reportConfigurationRepository.findByFactoryId(gauge.getFactory().getId())
                    .orElse(null);
            if (rc != null) {
                gauge.setCustomerLogo(rc.getCustomerLogo());
                gauge.setDocNo(rc.getDocNo());
                gauge.setRevNo(rc.getRevNo());
                gauge.setIssueDate(rc.getIssueDate());
                gaugeRepository.save(gauge);

                logo = gauge.getCustomerLogo();
                docNo = gauge.getDocNo();
                revNo = gauge.getRevNo();
                issueDate = gauge.getIssueDate();
            }
        }

        QualityReportDto.QualityReportDtoBuilder reportBuilder = QualityReportDto.builder()
                .poId(po.getId())
                .poNumber(po.getPoNumber())
                .customerName(po.getCustomer() != null ? po.getCustomer().getName() : "Internal")
                .gaugeId(gauge.getId())
                .serialNumber(gauge.getSerialNumber())
                .partName(gauge.getGaugeMaster() != null ? gauge.getGaugeMaster().getGaugeTypeName()
                        : gauge.getGaugeTypeName())
                .targetQuantity(gauge.getBatchQuantity() != null ? gauge.getBatchQuantity() : 0)
                .reportType(reportType)
                .generatedAt(OffsetDateTime.now())
                .customerLogo(logo)
                .docNo(docNo)
                .revNo(revNo)
                .issueDate(issueDate);

        List<PqcShiftApproval> approvals = approvalRepository.findByGaugeId(gaugeId);
        List<QualityReportDto.ApprovalDto> approvalDtos = approvals.stream()
                .map(a -> QualityReportDto.ApprovalDto.builder()
                        .shiftId(a.getShift().getId())
                        .shiftName(a.getShift().getShiftName())
                        .inspectionDate(a.getInspectionDate())
                        .inspectorName(a.getInspectorName())
                        .signature(a.getSignature())
                        .approvedAt(a.getApprovedAt())
                        .build())
                .collect(Collectors.toList());
        reportBuilder.approvals(approvalDtos);

        List<GaugeOperation> operations = gaugeOperationRepository.findByGaugeIdOrderBySequenceOrder(gaugeId);
        if (operationId != null) {
            operations = operations.stream().filter(op -> op.getId().equals(operationId)).collect(Collectors.toList());
        }

        List<QualityReportDto.OperationLogDto> opDtos = new ArrayList<>();

        for (GaugeOperation op : operations) {
            List<PqcInspectionLog> logs = inspectionLogRepository.findByGaugeOperationIdOrderByLogTimeAsc(op.getId());
            if (shiftId != null) {
                logs = logs.stream()
                        .filter(l -> l.getShift() != null && l.getShift().getId().equals(shiftId))
                        .collect(Collectors.toList());
            }
            if (filterDate != null && !filterDate.isEmpty()) {
                logs = logs.stream()
                        .filter(l -> {
                            // Convert OffsetDateTime to local date string YYYY-MM-DD
                            // Frontend sends 'YYYY-MM-DD' from <input type="date">
                            String logDate = l.getLogTime().toLocalDate().toString();
                            return logDate.equals(filterDate);
                        })
                        .collect(Collectors.toList());
            }
            // Fetch Question Set to map Question IDs to Parameter Names
            Optional<PqcQuestionSet> questionSetOpt = Optional.empty();
            if (op.getOperationMaster() != null) {
                List<PqcQuestionSet> sets = questionSetRepository.findActiveByOperationMasterIdAndGaugeMasterId(
                        op.getOperationMaster().getId(),
                        gauge.getGaugeMaster() != null ? gauge.getGaugeMaster().getId() : null);
                if (!sets.isEmpty()) {
                    questionSetOpt = Optional.of(sets.get(0));
                }
            }

            Map<String, PqcQuestion> questionMap = new HashMap<>();
            List<QualityReportDto.MeasurementDto> configuredParams = new ArrayList<>();
            questionSetOpt.ifPresent(qs -> {
                if (qs.getQuestions() != null) {
                    for (PqcQuestion q : qs.getQuestions()) {
                        questionMap.put(q.getId().toString(), q);
                        configuredParams.add(QualityReportDto.MeasurementDto.builder()
                                .questionId(q.getId().toString())
                                .parameterName(q.getQuestionText())
                                .expectedAnswer(q.getExpectedAnswer())
                                .minValue(q.getMinValue())
                                .maxValue(q.getMaxValue())
                                .unit(q.getUnit())
                                .checkingMethod(q.getCheckingMethod() != null ? q.getCheckingMethod() : "D.V.C")
                                .showInPdir(q.getShowInPdir() != null ? q.getShowInPdir() : true)
                                .build());
                    }
                }
            });

            if (logs.isEmpty() && configuredParams.isEmpty()) {
                continue;
            }

            List<QualityReportDto.BatchLogDto> batchDtos = new ArrayList<>();
            for (PqcInspectionLog log : logs) {
                List<QualityReportDto.MeasurementDto> measurements = new ArrayList<>();
                Set<String> consumedQuestionIds = new HashSet<>();
                Set<Integer> consumedIndices = new HashSet<>();

                // Helper map to look up historical questions for answers in this log
                if (log.getQuestionAnswers() != null) {
                    for (Map<String, Object> ans : log.getQuestionAnswers()) {
                        String qId = (String) ans.get("questionId");
                        if (qId != null && !questionMap.containsKey(qId)) {
                            try {
                                PqcQuestion q = questionRepository.findById(UUID.fromString(qId)).orElse(null);
                                if (q != null) {
                                    questionMap.put(qId, q);
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }

                // Add measurements for all configured parameters
                for (int i = 0; i < configuredParams.size(); i++) {
                    QualityReportDto.MeasurementDto cp = configuredParams.get(i);
                    Object val = null;

                    // 1. Try exact UUID match
                    if (log.getQuestionAnswers() != null) {
                        for (int j = 0; j < log.getQuestionAnswers().size(); j++) {
                            if (consumedIndices.contains(j)) continue;
                            Map<String, Object> ans = log.getQuestionAnswers().get(j);
                            String qId = (String) ans.get("questionId");
                            if (qId != null && qId.equals(cp.getQuestionId())) {
                                val = ans.get("answer");
                                consumedIndices.add(j);
                                consumedQuestionIds.add(qId);
                                break;
                            }
                        }
                    }

                    // 2. Try parameter name match (case-insensitive) if UUID didn't match
                    if (val == null && cp.getParameterName() != null && log.getQuestionAnswers() != null) {
                        for (int j = 0; j < log.getQuestionAnswers().size(); j++) {
                            if (consumedIndices.contains(j)) continue;
                            Map<String, Object> ans = log.getQuestionAnswers().get(j);
                            String qId = (String) ans.get("questionId");
                            PqcQuestion histQ = qId != null ? questionMap.get(qId) : null;
                            if (histQ != null && histQ.getQuestionText() != null &&
                                histQ.getQuestionText().trim().equalsIgnoreCase(cp.getParameterName().trim())) {
                                val = ans.get("answer");
                                consumedIndices.add(j);
                                if (qId != null) consumedQuestionIds.add(qId);
                                break;
                            }
                        }
                    }

                    // 3. Fallback to positional matching (index i)
                    if (val == null && log.getQuestionAnswers() != null && i < log.getQuestionAnswers().size() && !consumedIndices.contains(i)) {
                        Map<String, Object> ansAtIdx = log.getQuestionAnswers().get(i);
                        val = ansAtIdx.get("answer");
                        consumedIndices.add(i);
                        String qIdAtIdx = (String) ansAtIdx.get("questionId");
                        if (qIdAtIdx != null) consumedQuestionIds.add(qIdAtIdx);
                    }

                    measurements.add(QualityReportDto.MeasurementDto.builder()
                            .questionId(cp.getQuestionId())
                            .parameterName(cp.getParameterName())
                            .expectedAnswer(cp.getExpectedAnswer())
                            .minValue(cp.getMinValue())
                            .maxValue(cp.getMaxValue())
                            .unit(cp.getUnit())
                            .actualValue(val)
                            .checkingMethod(cp.getCheckingMethod())
                            .showInPdir(cp.getShowInPdir())
                            .build());
                }

                // Add any genuine extra historical answers that exceeded the configured checklist length
                if (log.getQuestionAnswers() != null) {
                    for (int j = 0; j < log.getQuestionAnswers().size(); j++) {
                        if (consumedIndices.contains(j)) continue;
                        // If index j is within configuredParams bounds, question #j was already included above
                        if (j < configuredParams.size()) continue;

                        Map<String, Object> ans = log.getQuestionAnswers().get(j);
                        String questionId = (String) ans.get("questionId");
                        PqcQuestion q = questionId != null ? questionMap.get(questionId) : null;

                        measurements.add(QualityReportDto.MeasurementDto.builder()
                                .questionId(questionId)
                                .parameterName(q != null && q.getQuestionText() != null ? q.getQuestionText() : "Archived Parameter #" + (j + 1))
                                .expectedAnswer(q != null ? q.getExpectedAnswer() : null)
                                .minValue(q != null ? q.getMinValue() : null)
                                .maxValue(q != null ? q.getMaxValue() : null)
                                .unit(q != null ? q.getUnit() : null)
                                .actualValue(ans.get("answer"))
                                .checkingMethod(q != null && q.getCheckingMethod() != null ? q.getCheckingMethod() : "D.V.C")
                                .showInPdir(q != null && q.getShowInPdir() != null ? q.getShowInPdir() : true)
                                .build());
                    }
                }

                batchDtos.add(QualityReportDto.BatchLogDto.builder()
                        .logId(log.getId())
                        .logTime(log.getLogTime())
                        .inspectorName(log.getInspector().getFullName())
                        .inspectedQty(log.getActualQty())
                        .passedQty(log.getPassedQty())
                        .rejectedQty(log.getRejectedQty())
                        .reworkQty(log.getReworkQty())
                        .scrapQty(log.getScrapQty())
                        .remarks(log.getRemarks())
                        .shiftName(log.getShift() != null ? log.getShift().getShiftName() : null)
                        .machineName(log.getMachine() != null ? log.getMachine().getMachineCode() : null)
                        .measurements(measurements)
                        .build());
            }

            opDtos.add(QualityReportDto.OperationLogDto.builder()
                    .operationId(op.getId())
                    .operationName(op.getOperationName())
                    .sequenceOrder(op.getSequenceOrder())
                    .batches(batchDtos)
                    .configuredParameters(configuredParams)
                    .build());
        }

        reportBuilder.operations(opDtos);
        return reportBuilder.build();
    }
}
