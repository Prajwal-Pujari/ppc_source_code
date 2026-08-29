package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.VisionInspectionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface VisionInspectionResultRepository extends JpaRepository<VisionInspectionResult, UUID> {
}
