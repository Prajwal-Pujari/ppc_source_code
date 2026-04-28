package com.mes.factory.repository.mysql;

import com.mes.factory.entity.mysql.PoStatusSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PoStatusSnapshotRepository extends JpaRepository<PoStatusSnapshot, Long> {

    List<PoStatusSnapshot> findByFactoryId(UUID factoryId);

    Optional<PoStatusSnapshot> findByFactoryIdAndPoId(UUID factoryId, UUID poId);
}
