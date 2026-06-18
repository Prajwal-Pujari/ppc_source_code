package com.mes.factory.entity.postgres;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pqc_shift_approvals", uniqueConstraints = {
    @UniqueConstraint(name = "uk_gauge_shift_date", columnNames = {"gauge_id", "shift_id", "inspection_date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PqcShiftApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gauge_id", nullable = false)
    private Gauge gauge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    private FactoryShift shift;

    @Column(name = "inspection_date", nullable = false, length = 50)
    private String inspectionDate;

    @Column(name = "inspector_name", nullable = false, length = 100)
    private String inspectorName;

    @Column(name = "signature", columnDefinition = "TEXT")
    private String signature;

    @CreationTimestamp
    @Column(name = "approved_at", nullable = false, updatable = false)
    private OffsetDateTime approvedAt;
}
