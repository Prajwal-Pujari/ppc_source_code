package com.mes.factory.entity.postgres;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "is3455_tolerance_values")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Is3455ToleranceValue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "range_id")
    @JsonIgnore
    private Is3455Range range;

    @Column(name = "sym_value", length = 10, nullable = false)
    private String symValue;

    @Column(name = "grd_5", precision = 10, scale = 4) private BigDecimal grd5;
    @Column(name = "grd_6", precision = 10, scale = 4) private BigDecimal grd6;
    @Column(name = "grd_7", precision = 10, scale = 4) private BigDecimal grd7;
    @Column(name = "grd_8", precision = 10, scale = 4) private BigDecimal grd8;
    @Column(name = "grd_9", precision = 10, scale = 4) private BigDecimal grd9;
    @Column(name = "grd_10", precision = 10, scale = 4) private BigDecimal grd10;
    @Column(name = "grd_11", precision = 10, scale = 4) private BigDecimal grd11;
    @Column(name = "grd_12", precision = 10, scale = 4) private BigDecimal grd12;
    @Column(name = "grd_13", precision = 10, scale = 4) private BigDecimal grd13;
    @Column(name = "grd_14", precision = 10, scale = 4) private BigDecimal grd14;
    @Column(name = "grd_15", precision = 10, scale = 4) private BigDecimal grd15;
    @Column(name = "grd_16", precision = 10, scale = 4) private BigDecimal grd16;

    public BigDecimal getGradeValue(int grade) {
        return switch (grade) {
            case 5 -> grd5; case 6 -> grd6; case 7 -> grd7; case 8 -> grd8;
            case 9 -> grd9; case 10 -> grd10; case 11 -> grd11; case 12 -> grd12;
            case 13 -> grd13; case 14 -> grd14; case 15 -> grd15; case 16 -> grd16;
            default -> null;
        };
    }
}
