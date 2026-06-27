package com.mes.factory.service;

import com.mes.factory.dto.request.UserCreateRequest;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.entity.postgres.UserRole;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.FactoryRepository;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.security.CustomUserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FactoryRepository factoryRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, FactoryRepository factoryRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.factoryRepository = factoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User createUser(UserCreateRequest request, CustomUserDetails currentUser) {
        // Validate if current user has permission (Admin is allowed via Controller PreAuthorize, but Supervisors need the flag)
        if (UserRole.SUPERVISOR.name().equals(currentUser.getRole())) {
            User currentEntity = userRepository.findById(currentUser.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            if (!Boolean.TRUE.equals(currentEntity.getCanManageUsers())) {
                throw new SecurityException("You do not have permission to create users");
            }
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        Factory factory = factoryRepository.findById(currentUser.getFactoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Factory not found"));

        User newUser = User.builder()
                .factory(factory)
                .fullName(request.getFullName())
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .canManageUsers(request.getRole() == UserRole.SUPERVISOR && request.isCanManageUsers())
                .isCalibrationWorker(request.isCalibrationWorker())
                .isActive(true)
                .build();

        return userRepository.save(newUser);
    }

    @Transactional
    public User toggleUserPermission(UUID userId, boolean canManage, CustomUserDetails currentUser) {
        // Only Admins can grant permissions
        if (!UserRole.ADMIN.name().equals(currentUser.getRole())) {
            throw new SecurityException("Only Administrators can modify user permissions");
        }

        User user = userRepository.findByIdAndFactoryId(userId, currentUser.getFactoryId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.SUPERVISOR) {
            throw new IllegalArgumentException("Can only set manage permissions for Supervisors");
        }

        user.setCanManageUsers(canManage);
        return userRepository.save(user);
    }

    @Transactional
    public User toggleCalibrationWorker(UUID userId, boolean isCalibration, CustomUserDetails currentUser) {
        // Only Admins or Supervisors with manage perms can grant permissions
        if (!UserRole.ADMIN.name().equals(currentUser.getRole())) {
            User currentEntity = userRepository.findById(currentUser.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            if (!Boolean.TRUE.equals(currentEntity.getCanManageUsers())) {
                throw new SecurityException("You do not have permission to modify users");
            }
        }

        User user = userRepository.findByIdAndFactoryId(userId, currentUser.getFactoryId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setIsCalibrationWorker(isCalibration);
        return userRepository.save(user);
    }

    @Transactional
    public User updateSignature(UUID userId, String signatureUrl, CustomUserDetails currentUser) {
        User user = userRepository.findByIdAndFactoryId(userId, currentUser.getFactoryId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setSignatureUrl(signatureUrl);
        return userRepository.save(user);
    }
}
