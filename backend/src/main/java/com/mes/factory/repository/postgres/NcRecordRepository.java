package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.NcRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NcRecordRepository extends JpaRepository<NcRecord, UUID> {

    List<NcRecord> findByGaugeIdOrderByCreatedAtDesc(UUID gaugeId);

    List<NcRecord> findByGaugeOperationId(UUID gaugeOperationId);

    List<NcRecord> findAllByOrderByCreatedAtDesc();
}
