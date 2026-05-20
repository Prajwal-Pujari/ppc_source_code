package com.mes.factory.entity.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity @Table(name = "is3455_ranges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Is3455Range {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "range_label", length = 30, nullable = false)
    private String rangeLabel;

    @Column(name = "nominal_size_max", precision = 10, scale = 4, nullable = false)
    private BigDecimal nominalSizeMax;

    @Column(name = "tolerance_type", length = 30, nullable = false)
    private String toleranceType;

    @OneToMany(mappedBy = "range", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<Is3455ToleranceValue> values;
}
