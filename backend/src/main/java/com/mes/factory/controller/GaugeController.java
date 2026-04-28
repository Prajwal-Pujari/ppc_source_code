package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.Gauge;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.entity.postgres.NcRecord;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.GaugeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gauges")
public class GaugeController {

    private final GaugeService gaugeService;

    public GaugeController(GaugeService gaugeService) {
        this.gaugeService = gaugeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Gauge>>> getGauges(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                gaugeService.getGauges(user.getFactoryId(), status, search, pageable)));
    }

    @GetMapping("/job-cards")
    public ResponseEntity<ApiResponse<List<Gauge>>> getJobCards(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(
                gaugeService.getJobCards(user.getFactoryId(), search)));
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
