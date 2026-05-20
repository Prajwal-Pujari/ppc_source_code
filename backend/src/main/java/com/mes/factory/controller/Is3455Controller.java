package com.mes.factory.controller;

import com.mes.factory.entity.postgres.Is3455Range;
import com.mes.factory.repository.postgres.Is3455RangeRepository;
import com.mes.factory.dto.request.Is3455CalculateRequest;
import com.mes.factory.dto.response.Is3455CalculateResponse;
import com.mes.factory.entity.postgres.PoLineItem;
import com.mes.factory.service.Is3455CalculationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/is3455")
public class Is3455Controller {

    private final Is3455RangeRepository rangeRepository;
    private final Is3455CalculationService calculationService;

    public Is3455Controller(Is3455RangeRepository rangeRepository, Is3455CalculationService calculationService) {
        this.rangeRepository = rangeRepository;
        this.calculationService = calculationService;
    }

    @GetMapping
    public ResponseEntity<List<Is3455Range>> getAll() {
        return ResponseEntity.ok(rangeRepository.findAllByOrderByIdAsc());
    }

    @GetMapping("/plug")
    public ResponseEntity<List<Is3455Range>> getPlug() {
        return ResponseEntity.ok(rangeRepository.findByToleranceTypeOrderByNominalSizeMaxAsc("Plug Tolerance"));
    }

    @GetMapping("/snap")
    public ResponseEntity<List<Is3455Range>> getSnap() {
        return ResponseEntity.ok(rangeRepository.findByToleranceTypeOrderByNominalSizeMaxAsc("Snap Tolerance"));
    }

    @PostMapping("/calculate")
    public ResponseEntity<Is3455CalculateResponse> calculate(@RequestBody Is3455CalculateRequest request) {
        PoLineItem dummyItem = new PoLineItem();
        dummyItem.setNominalSize(request.getNominalSize());
        dummyItem.setToleranceType(request.getToleranceType());
        dummyItem.setHigherSize(request.getHigherSize());
        dummyItem.setLowerSize(request.getLowerSize());

        calculationService.calculateAndApplyTolerances(dummyItem);

        Is3455CalculateResponse response = Is3455CalculateResponse.builder()
                .workpieceToleranceT(dummyItem.getWorkpieceToleranceT())
                .gaugeToleranceH(dummyItem.getGaugeToleranceH())
                .wearAllowanceY(dummyItem.getWearAllowanceY())
                .gaugeAllowanceZ(dummyItem.getGaugeAllowanceZ())
                .wearLimit(dummyItem.getWearLimit())
                .goSize(dummyItem.getGoSize())
                .nogoSize(dummyItem.getNogoSize())
                .goTolPlus(dummyItem.getGoTolPlus())
                .goTolMinus(dummyItem.getGoTolMinus())
                .nogoTolPlus(dummyItem.getNogoTolPlus())
                .nogoTolMinus(dummyItem.getNogoTolMinus())
                .nogoWearAllowanceA(dummyItem.getNogoWearAllowanceA())
                .matchedRange(dummyItem.getMatchedRange())
                .matchedGrade(dummyItem.getMatchedGrade())
                .build();

        return ResponseEntity.ok(response);
    }
}
