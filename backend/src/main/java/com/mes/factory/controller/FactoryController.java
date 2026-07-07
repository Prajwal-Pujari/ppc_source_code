package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.security.CustomUserDetails;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/factories")
public class FactoryController {

    private final FactoryRepository factoryRepository;

    public FactoryController(FactoryRepository factoryRepository) {
        this.factoryRepository = factoryRepository;
    }

    @GetMapping("/current")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Factory>> getCurrentFactory(
            @AuthenticationPrincipal CustomUserDetails user) {
        Factory factory = factoryRepository.findById(user.getFactoryId())
                .orElseThrow(() -> new RuntimeException("Factory not found"));
        return ResponseEntity.ok(ApiResponse.success(factory, "Factory details retrieved"));
    }

    @PutMapping("/{id}/modules")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<Factory>> updateModules(
            @PathVariable UUID id,
            @RequestBody ModuleToggleRequest request) {
        Factory factory = factoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Factory not found"));
        if (request.getMesEnabled() != null) factory.setMesEnabled(request.getMesEnabled());
        if (request.getPqcEnabled() != null) factory.setPqcEnabled(request.getPqcEnabled());
        if (request.getLpaEnabled() != null) factory.setLpaEnabled(request.getLpaEnabled());
        factory = factoryRepository.save(factory);
        return ResponseEntity.ok(ApiResponse.success(factory, "Module toggles updated successfully"));
    }

    @Data
    public static class ModuleToggleRequest {
        private Boolean mesEnabled;
        private Boolean pqcEnabled;
        private Boolean lpaEnabled;
    }
}
