package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    List<ActivityLog> findByEntityTypeAndEntityId(String entityType, UUID entityId);

    Page<ActivityLog> findByPerformedByIdAndPerformedAtBetween(UUID performedBy,
                                                               OffsetDateTime start,
                                                               OffsetDateTime end,
                                                               Pageable pageable);
}
