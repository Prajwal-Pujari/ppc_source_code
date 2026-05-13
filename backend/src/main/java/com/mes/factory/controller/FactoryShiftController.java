package com.mes.factory.controller;

import com.mes.factory.dto.request.CreateShiftRequest;
import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.FactoryShift;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.service.FactoryShiftService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/master/shifts")
public class FactoryShiftController {

    private final FactoryShiftService shiftService;

    public FactoryShiftController(FactoryShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','QUALITY_INSPECTOR')")
    public ResponseEntity<ApiResponse<List<FactoryShift>>> getAll(@AuthenticationPrincipal CustomUserDetails user) {
        List<FactoryShift> shifts = shiftService.getAllActiveByFactory(user.getFactoryId());
        return ResponseEntity.ok(ApiResponse.success(shifts, "Shifts retrieved successfully"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<FactoryShift>> create(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody CreateShiftRequest request) {
        FactoryShift shift = shiftService.create(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(shift, "Shift created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<FactoryShift>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateShiftRequest request) {
        FactoryShift shift = shiftService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(shift, "Shift updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        shiftService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Shift deleted successfully"));
    }
}
