package com.mes.factory.controller;

import com.mes.factory.dto.MachineMasterDto;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.MachineMasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/machines")
@RequiredArgsConstructor
public class MachineMasterController {

    private final MachineMasterService machineMasterService;

    @GetMapping
    public ResponseEntity<List<MachineMasterDto>> getActiveMachines(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(machineMasterService.getActiveMachines(user.getFactoryId()));
    }

    @GetMapping("/events")
    public ResponseEntity<List<com.mes.factory.dto.MachineScheduleEventDto>> getMachineScheduleEvents(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(machineMasterService.getMachineScheduleEvents(user.getFactoryId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<MachineMasterDto> createMachine(@AuthenticationPrincipal CustomUserDetails user, @RequestBody MachineMasterDto dto) {
        return ResponseEntity.ok(machineMasterService.createMachine(user.getFactoryId(), dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<MachineMasterDto> updateMachine(@PathVariable UUID id, @RequestBody MachineMasterDto dto) {
        return ResponseEntity.ok(machineMasterService.updateMachine(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<Void> deleteMachine(@PathVariable UUID id) {
        machineMasterService.deleteMachine(id);
        return ResponseEntity.ok().build();
    }
}
