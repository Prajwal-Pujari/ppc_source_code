package com.mes.factory.controller;

import com.mes.factory.dto.ReportConfigurationDto;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.ReportConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/report-configuration")
@RequiredArgsConstructor
public class ReportConfigurationController {

    private final ReportConfigurationService reportConfigurationService;

    @GetMapping
    public ResponseEntity<ReportConfigurationDto> getConfiguration(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(reportConfigurationService.getConfiguration(user.getFactoryId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<ReportConfigurationDto> saveConfiguration(@AuthenticationPrincipal CustomUserDetails user, @RequestBody ReportConfigurationDto dto) {
        return ResponseEntity.ok(reportConfigurationService.saveConfiguration(user.getFactoryId(), dto));
    }
}
