package com.mes.factory.service;

import com.mes.factory.dto.response.QualityReportDto;
import com.mes.factory.entity.postgres.*;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.PqcInspectionLogRepository;
import com.mes.factory.repository.postgres.PqcQuestionSetRepository;
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

    @Transactional(readOnly = true)
    public QualityReportDto generateReport(UUID gaugeId, String reportType) {
        Gauge gauge = gaugeRepository.findById(gaugeId)
                .orElseThrow(() -> new ResourceNotFoundException("Gauge", "id", gaugeId));

        PurchaseOrder po = gauge.getPurchaseOrder();

        QualityReportDto.QualityReportDtoBuilder reportBuilder = QualityReportDto.builder()
                .poId(po.getId())
                .poNumber(po.getPoNumber())
                .customerName(po.getCustomer() != null ? po.getCustomer().getName() : "Internal")
                .gaugeId(gauge.getId())
                .serialNumber(gauge.getSerialNumber())
                .partName(gauge.getGaugeMaster() != null ? gauge.getGaugeMaster().getGaugeTypeName() : gauge.getGaugeTypeName())
                .targetQuantity(gauge.getBatchQuantity() != null ? gauge.getBatchQuantity() : 0)
                .reportType(reportType)
                .generatedAt(OffsetDateTime.now());

        List<GaugeOperation> operations = gaugeOperationRepository.findByGaugeIdOrderBySequenceOrder(gaugeId);
        List<QualityReportDto.OperationLogDto> opDtos = new ArrayList<>();

        for (GaugeOperation op : operations) {
            List<PqcInspectionLog> logs = inspectionLogRepository.findByGaugeOperationIdOrderByLogTimeDesc(op.getId());

            // Fetch Question Set to map Question IDs to Parameter Names
            // For older logs, we just fetch the current active question set. In a true system, we'd snapshot it.
            Optional<PqcQuestionSet> questionSetOpt = Optional.empty();
            if (op.getOperationMaster() != null) {
                List<PqcQuestionSet> sets = questionSetRepository.findActiveByOperationMasterIdAndGaugeMasterId(
                        op.getOperationMaster().getId(),
                        gauge.getGaugeMaster() != null ? gauge.getGaugeMaster().getId() : null
                );
                if (!sets.isEmpty()) {
                    questionSetOpt = Optional.of(sets.get(0));
                }
            }

            Map<String, PqcQuestion> questionMap = new HashMap<>();
            questionSetOpt.ifPresent(qs -> {
                if (qs.getQuestions() != null) {
                    for (PqcQuestion q : qs.getQuestions()) {
                        questionMap.put(q.getId().toString(), q);
                    }
                }
            });

            List<QualityReportDto.BatchLogDto> batchDtos = new ArrayList<>();
            for (PqcInspectionLog log : logs) {
                List<QualityReportDto.MeasurementDto> measurements = new ArrayList<>();

                if (log.getQuestionAnswers() != null) {
                    for (Map<String, Object> ans : log.getQuestionAnswers()) {
                        String questionId = (String) ans.get("questionId");
                        Object value = ans.get("answer");

                        PqcQuestion q = questionMap.get(questionId);
                        measurements.add(QualityReportDto.MeasurementDto.builder()
                                .questionId(questionId)
                                .parameterName(q != null ? q.getQuestionText() : "Unknown Parameter")
                                .expectedAnswer(q != null ? q.getExpectedAnswer() : null)
                                .minValue(q != null ? q.getMinValue() : null)
                                .maxValue(q != null ? q.getMaxValue() : null)
                                .unit(q != null ? q.getUnit() : null)
                                .actualValue(value)
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
                        .measurements(measurements)
                        .build());
            }

            opDtos.add(QualityReportDto.OperationLogDto.builder()
                    .operationId(op.getId())
                    .operationName(op.getOperationName())
                    .sequenceOrder(op.getSequenceOrder())
                    .batches(batchDtos)
                    .build());
        }

        reportBuilder.operations(opDtos);
        return reportBuilder.build();
    }
}
