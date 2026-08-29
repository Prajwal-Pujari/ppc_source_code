package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.VisionInspectionCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface VisionInspectionCheckpointRepository extends JpaRepository<VisionInspectionCheckpoint, UUID> {
}
