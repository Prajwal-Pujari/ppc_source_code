package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.GaugeOperation;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.GaugeOperationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/worker/tasks")
public class WorkerTaskController {

    private final GaugeOperationService gaugeOperationService;

    public WorkerTaskController(GaugeOperationService gaugeOperationService) {
        this.gaugeOperationService = gaugeOperationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
    public ResponseEntity<ApiResponse<List<GaugeOperation>>> getMyTasks(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(gaugeOperationService.getWorkerTasks(user.getUserId())));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getMyTaskSummary(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(gaugeOperationService.getWorkerTaskSummary(user.getUserId())));
    }
}
