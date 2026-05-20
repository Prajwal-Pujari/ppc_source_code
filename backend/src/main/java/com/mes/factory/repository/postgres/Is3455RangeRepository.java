package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.Is3455Range;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface Is3455RangeRepository extends JpaRepository<Is3455Range, Integer> {

    @Query("SELECT r FROM Is3455Range r WHERE r.toleranceType = :toleranceType " +
           "AND r.nominalSizeMax >= :nominalSize ORDER BY r.nominalSizeMax ASC")
    List<Is3455Range> findMatchingRanges(
            @Param("toleranceType") String toleranceType,
            @Param("nominalSize") BigDecimal nominalSize);

    List<Is3455Range> findByToleranceTypeOrderByNominalSizeMaxAsc(String toleranceType);

    List<Is3455Range> findAllByOrderByIdAsc();
}
