package com.mes.factory.service;

import com.mes.factory.entity.postgres.Is3455Range;
import com.mes.factory.entity.postgres.Is3455ToleranceValue;
import com.mes.factory.entity.postgres.PoLineItem;
import com.mes.factory.repository.postgres.Is3455RangeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class Is3455CalculationService {

    private static final Logger log = LoggerFactory.getLogger(Is3455CalculationService.class);
    private final Is3455RangeRepository rangeRepository;

    public Is3455CalculationService(Is3455RangeRepository rangeRepository) {
        this.rangeRepository = rangeRepository;
    }

    public void calculateAndApplyTolerances(PoLineItem lineItem) {
        if (lineItem.getHigherSize() == null || lineItem.getLowerSize() == null
                || lineItem.getToleranceType() == null || lineItem.getToleranceType().isBlank()) {
            return;
        }

        BigDecimal higher = lineItem.getHigherSize();
        BigDecimal lower = lineItem.getLowerSize();
        BigDecimal nominal = extractNumericValue(lineItem.getNominalSize());
        if (nominal == null) {
            nominal = higher; // Fallback for table lookup if string is not parsable
        }
        
        BigDecimal t = higher.subtract(lower).abs();
        lineItem.setWorkpieceToleranceT(t);

        // Map tolerance type from UI to DB
        String dbType = "PLUG".equalsIgnoreCase(lineItem.getToleranceType())
                ? "Plug Tolerance" : "Snap Tolerance";

        // Find matching range
        List<Is3455Range> ranges = rangeRepository.findMatchingRanges(dbType, nominal);
        if (ranges.isEmpty()) {
            log.warn("No IS 3455 range found for type={}, nominal={}", dbType, nominal);
            return;
        }
        Is3455Range range = ranges.get(0); // smallest matching range

        // Get all symbol rows for this range
        Map<String, Is3455ToleranceValue> symMap = range.getValues().stream()
                .collect(Collectors.toMap(Is3455ToleranceValue::getSymValue, v -> v));

        Is3455ToleranceValue tRow = symMap.get("T");
        if (tRow == null) {
            log.warn("No T row found for range {}", range.getRangeLabel());
            return;
        }

        int matchedGrade = findMatchingGrade(tRow, t);
        if (matchedGrade == -1) {
            log.warn("No matching IT grade for T={} in range {}", t, range.getRangeLabel());
            return;
        }
        lineItem.setMatchedRange(range.getRangeLabel());
        lineItem.setMatchedGrade(matchedGrade);

        // Read H/2, Y, Z, A from the matched grade
        Is3455ToleranceValue hRow = symMap.get("H/2");
        Is3455ToleranceValue yRow = symMap.get("Y");
        Is3455ToleranceValue zRow = symMap.get("Z");
        Is3455ToleranceValue aRow = symMap.get("A");

        BigDecimal halfH = hRow != null ? hRow.getGradeValue(matchedGrade) : BigDecimal.ZERO;
        BigDecimal y = yRow != null ? yRow.getGradeValue(matchedGrade) : BigDecimal.ZERO;
        BigDecimal z = zRow != null ? zRow.getGradeValue(matchedGrade) : BigDecimal.ZERO;
        BigDecimal a = aRow != null ? aRow.getGradeValue(matchedGrade) : BigDecimal.ZERO;

        if (halfH == null) halfH = BigDecimal.ZERO;
        if (y == null) y = BigDecimal.ZERO;
        if (z == null) z = BigDecimal.ZERO;
        if (a == null) a = BigDecimal.ZERO;

        lineItem.setGaugeToleranceH(halfH);
        lineItem.setWearAllowanceY(y);
        lineItem.setGaugeAllowanceZ(z);
        lineItem.setNogoWearAllowanceA(a);

        // Calculate GO Tol(+/-), NOGO Tol(+/-), Wear Limit
        if ("PLUG".equalsIgnoreCase(lineItem.getToleranceType())) {
            // Plug Gauge (for holes)
            // GO gauge center = Lower Limit + Z
            BigDecimal goCenter = lower.add(z);
            lineItem.setGoSize(goCenter);
            lineItem.setGoTolPlus(goCenter.add(halfH));      // GO (+) = Lower + Z + H/2
            lineItem.setGoTolMinus(goCenter.subtract(halfH)); // GO (-) = Lower + Z - H/2

            // NOGO gauge center = Upper Limit (Higher)
            lineItem.setNogoSize(higher);
            lineItem.setNogoTolPlus(higher.add(halfH));       // NOGO (+) = Higher + H/2
            lineItem.setNogoTolMinus(higher.subtract(halfH)); // NOGO (-) = Higher - H/2

            // Wear Limit = Lower Limit - Y
            lineItem.setWearLimit(lower.subtract(y));
        } else {
            // Snap Gauge (for shafts)
            // GO gauge center = Upper Limit - Z
            BigDecimal goCenter = higher.subtract(z);
            lineItem.setGoSize(goCenter);
            lineItem.setGoTolPlus(goCenter.add(halfH));       // GO (+) = Higher - Z + H/2
            lineItem.setGoTolMinus(goCenter.subtract(halfH)); // GO (-) = Higher - Z - H/2

            // NOGO gauge center = Lower Limit
            lineItem.setNogoSize(lower);
            lineItem.setNogoTolPlus(lower.add(halfH));        // NOGO (+) = Lower + H/2
            lineItem.setNogoTolMinus(lower.subtract(halfH));  // NOGO (-) = Lower - H/2

            // Wear Limit = Upper Limit + Y
            lineItem.setWearLimit(higher.add(y));
        }

        log.info("IS 3455 calculated for {} range={} grade=IT{}: H/2={}, Y={}, Z={}, GO+={}, GO-={}, NOGO+={}, NOGO-={}, WL={}",
                lineItem.getToleranceType(), range.getRangeLabel(), matchedGrade,
                halfH, y, z, lineItem.getGoTolPlus(), lineItem.getGoTolMinus(),
                lineItem.getNogoTolPlus(), lineItem.getNogoTolMinus(), lineItem.getWearLimit());
    }

    private int findMatchingGrade(Is3455ToleranceValue tRow, BigDecimal workpieceTolerance) {
        for (int grade = 5; grade <= 16; grade++) {
            BigDecimal gradeT = tRow.getGradeValue(grade);
            if (gradeT != null && gradeT.compareTo(BigDecimal.ZERO) != 0
                    && gradeT.compareTo(workpieceTolerance) == 0) {
                return grade;
            }
        }
        // If no exact match, find closest
        int closest = -1;
        BigDecimal minDiff = null;
        for (int grade = 5; grade <= 16; grade++) {
            BigDecimal gradeT = tRow.getGradeValue(grade);
            if (gradeT != null && gradeT.compareTo(BigDecimal.ZERO) != 0) {
                BigDecimal diff = gradeT.subtract(workpieceTolerance).abs();
                if (minDiff == null || diff.compareTo(minDiff) < 0) {
                    minDiff = diff;
                    closest = grade;
                }
            }
        }
        return closest;
    }

    private BigDecimal extractNumericValue(String input) {
        if (input == null || input.trim().isEmpty()) return null;
        // Matches leading numbers like "34.5", "20", "20.0" before any text or dash
        Matcher m = Pattern.compile("^\\d+(\\.\\d+)?").matcher(input.trim());
        if (m.find()) {
            try {
                return new BigDecimal(m.group());
            } catch (Exception e) {}
        }
        return null;
    }
}
