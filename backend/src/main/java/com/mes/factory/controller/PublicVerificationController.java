package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.NcRecord;
import com.mes.factory.service.GaugeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/gauges")
public class PublicVerificationController {

    private final GaugeService gaugeService;

    public PublicVerificationController(GaugeService gaugeService) {
        this.gaugeService = gaugeService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Gauge>> getGauge(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(gaugeService.getGauge(id)));
    }

    @GetMapping("/{id}/operations")
    public ResponseEntity<ApiResponse<List<GaugeOperation>>> getGaugeOperations(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(gaugeService.getGaugeOperations(id)));
    }

    @GetMapping("/{id}/nc-records")
    public ResponseEntity<ApiResponse<List<NcRecord>>> getGaugeNcRecords(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(gaugeService.getGaugeNcRecords(id)));
    }
}
