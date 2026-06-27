package com.mes.factory.scheduler;

import com.mes.factory.entity.mysql.DailyProductionSummary;
import com.mes.factory.entity.mysql.PoStatusSnapshot;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.entity.postgres.GaugeStatus;
import com.mes.factory.entity.postgres.PoStatus;
import com.mes.factory.entity.postgres.PurchaseOrder;
import com.mes.factory.repository.mysql.DailyProductionSummaryRepository;
import com.mes.factory.repository.mysql.PoStatusSnapshotRepository;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.GaugeOperationRepository;
import com.mes.factory.repository.postgres.GaugeRepository;
import com.mes.factory.repository.postgres.PurchaseOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
@EnableScheduling
public class AnalyticsSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsSyncScheduler.class);

    private final FactoryRepository factoryRepository;
    private final GaugeRepository gaugeRepository;
    private final GaugeOperationRepository gaugeOperationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DailyProductionSummaryRepository dailyProductionSummaryRepository;
    private final PoStatusSnapshotRepository poStatusSnapshotRepository;

    public AnalyticsSyncScheduler(FactoryRepository factoryRepository,
                                   GaugeRepository gaugeRepository,
                                   GaugeOperationRepository gaugeOperationRepository,
                                   PurchaseOrderRepository purchaseOrderRepository,
                                   DailyProductionSummaryRepository dailyProductionSummaryRepository,
                                   PoStatusSnapshotRepository poStatusSnapshotRepository) {
        this.factoryRepository = factoryRepository;
        this.gaugeRepository = gaugeRepository;
        this.gaugeOperationRepository = gaugeOperationRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.dailyProductionSummaryRepository = dailyProductionSummaryRepository;
        this.poStatusSnapshotRepository = poStatusSnapshotRepository;
    }

    @Scheduled(fixedRate = 300000)
    @Transactional("postgresTransactionManager") // ✅ matches @Bean(name = "postgresTransactionManager")
    public void syncDailyProduction() {
        log.debug("Running syncDailyProduction...");
        List<Factory> factories = factoryRepository.findAll();
        LocalDate today = LocalDate.now();
        OffsetDateTime startOfDay = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOfDay = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        for (Factory factory : factories) {
            try {
                long completed = gaugeRepository.sumBatchQuantityByFactoryIdAndStatus(factory.getId(), GaugeStatus.COMPLETED);
                long rejected = gaugeRepository.sumBatchQuantityByFactoryIdAndStatus(factory.getId(), GaugeStatus.REJECTED);
                long opsCompleted = gaugeOperationRepository.sumCompletedOperationsBatchQuantityToday(
                        factory.getId(), startOfDay, endOfDay);

                BigDecimal rejectionRate = (completed + rejected) > 0
                        ? BigDecimal.valueOf(rejected).multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(completed + rejected), 2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                DailyProductionSummary summary = dailyProductionSummaryRepository
                        .findByFactoryIdAndSummaryDate(factory.getId(), today)
                        .orElse(DailyProductionSummary.builder()
                                .factoryId(factory.getId())
                                .summaryDate(today)
                                .build());

                summary.setGaugesCompleted((int) completed);
                summary.setGaugesRejected((int) rejected);
                summary.setOperationsCompleted((int) opsCompleted);
                summary.setRejectionRate(rejectionRate);
                dailyProductionSummaryRepository.save(summary);
            } catch (Exception e) {
                log.warn("Failed to sync daily production for factory {}: {}", factory.getId(), e.getMessage());
            }
        }
    }

    @Scheduled(fixedRate = 300000)
    @Transactional("postgresTransactionManager") // ✅ keeps Hibernate session open so po.getCustomer() works
    public void syncPoStatusSnapshots() {
        log.debug("Running syncPoStatusSnapshots...");
        List<Factory> factories = factoryRepository.findAll();

        for (Factory factory : factories) {
            try {
                List<PurchaseOrder> pos = purchaseOrderRepository.findByFactoryIdAndStatusNot(
                        factory.getId(), PoStatus.CANCELLED);

                for (PurchaseOrder po : pos) {
                    BigDecimal percentComplete = po.getTotalGauges() > 0
                            ? BigDecimal.valueOf(po.getCompletedGauges())
                                .multiply(BigDecimal.valueOf(100))
                                .divide(BigDecimal.valueOf(po.getTotalGauges()), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    PoStatusSnapshot snapshot = poStatusSnapshotRepository
                            .findByFactoryIdAndPoId(factory.getId(), po.getId())
                            .orElse(PoStatusSnapshot.builder()
                                    .factoryId(factory.getId())
                                    .poId(po.getId())
                                    .build());

                    snapshot.setPoNumber(po.getPoNumber());
                    snapshot.setCustomerName(po.getCustomer() != null ? po.getCustomer().getName() : "N/A");
                    snapshot.setCustomerSrNumber(po.getCustomerSrNumber());
                    snapshot.setManufactureNumber(po.getManufactureNumber());
                    snapshot.setTotalGauges(po.getTotalGauges());
                    snapshot.setCompletedGauges(po.getCompletedGauges());
                    snapshot.setRejectedGauges(po.getRejectedGauges());
                    snapshot.setPercentComplete(percentComplete);
                    snapshot.setExpectedDelivery(po.getExpectedDeliveryDate());
                    snapshot.setSnapshotAt(LocalDateTime.now());
                    poStatusSnapshotRepository.save(snapshot);
                }
            } catch (Exception e) {
                log.warn("Failed to sync PO snapshots for factory {}: {}", factory.getId(), e.getMessage());
            }
        }
    }
}