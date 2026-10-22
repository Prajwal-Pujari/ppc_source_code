package com.mes.factory.controller;

import com.mes.factory.dto.response.ApiResponse;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.entity.postgres.UserRole;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.repository.postgres.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.mes.factory.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    public UserController(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        User currentUser = userRepository.findById(user.getUserId())
                .orElseThrow(() -> new com.mes.factory.exception.ResourceNotFoundException("User not found"));
        currentUser.setAssignedPassword(null);
        currentUser.setPasswordHash(null);
        return ResponseEntity.ok(ApiResponse.success(currentUser));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<List<User>>> getUsers(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<User> users = userRepository.findByFactoryIdAndIsActiveTrue(user.getFactoryId());
        if (!"ADMIN".equals(user.getRole())) {
            users.forEach(u -> u.setAssignedPassword(null));
        }
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/workers")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<List<User>>> getWorkers(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<User> workers = userRepository.findByFactoryIdAndRoleAndIsActiveTrue(
                user.getFactoryId(), UserRole.WORKER);
        if (!"ADMIN".equals(user.getRole())) {
            workers.forEach(w -> w.setAssignedPassword(null));
        }
        return ResponseEntity.ok(ApiResponse.success(workers));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<User>> createUser(
            @Valid @RequestBody com.mes.factory.dto.request.UserCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(userService.createUser(request, user)));
    }

    @PatchMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> togglePermissions(
            @PathVariable java.util.UUID id,
            @RequestParam boolean canManage,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(userService.toggleUserPermission(id, canManage, user)));
    }

    @PatchMapping("/{id}/pqc-authority")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> togglePqcAuthority(
            @PathVariable java.util.UUID id,
            @RequestParam boolean hasAuthority,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(userService.togglePqcAuthority(id, hasAuthority, user)));
    }

    @PatchMapping("/{id}/signature")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<ApiResponse<User>> updateSignature(
            @PathVariable java.util.UUID id,
            @RequestBody java.util.Map<String, String> payload,
            @AuthenticationPrincipal CustomUserDetails user) {
        String signature = payload.get("signature");
        return ResponseEntity.ok(ApiResponse.success(userService.updateSignature(id, signature, user)));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> resetPassword(
            @PathVariable java.util.UUID id,
            @RequestBody java.util.Map<String, String> payload,
            @AuthenticationPrincipal CustomUserDetails user) {
        String newPassword = payload.get("newPassword");
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        return ResponseEntity.ok(ApiResponse.success(userService.resetPassword(id, newPassword.trim(), user)));
    }
}
