package com.mes.factory.service;

import com.mes.factory.dto.request.LoginRequest;
import com.mes.factory.dto.response.AuthResponse;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.repository.postgres.UserRepository;
import com.mes.factory.security.CustomUserDetails;
import com.mes.factory.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtTokenProvider tokenProvider,
                       UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("=== LOGIN ATTEMPT for: {}", request.getUsername());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            log.info("=== AUTH SUCCESS for: {}", request.getUsername());

            SecurityContextHolder.getContext().setAuthentication(authentication);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            String accessToken = tokenProvider.generateAccessToken(
                    userDetails.getUserId(),
                    userDetails.getFactoryId(),
                    userDetails.getUsername(),
                    userDetails.getRole(),
                    userDetails.getFullName(),
                    userDetails.getEmployeeCode()
            );
            String refreshToken = tokenProvider.generateRefreshToken(userDetails.getUserId());

            // Update last login & fetch factory module flags
            User user = userRepository.findById(userDetails.getUserId()).orElse(null);
            Boolean mesEnabled = true, pqcEnabled = true, lpaEnabled = true;
            if (user != null) {
                user.setLastLoginAt(OffsetDateTime.now());
                userRepository.save(user);
                if (user.getFactory() != null) {
                    mesEnabled = user.getFactory().getMesEnabled() != null ? user.getFactory().getMesEnabled() : true;
                    pqcEnabled = user.getFactory().getPqcEnabled() != null ? user.getFactory().getPqcEnabled() : true;
                    lpaEnabled = user.getFactory().getLpaEnabled() != null ? user.getFactory().getLpaEnabled() : true;
                }
            }

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .user(AuthResponse.UserInfo.builder()
                            .id(userDetails.getUserId())
                            .username(userDetails.getUsername())
                            .fullName(userDetails.getFullName())
                            .role(userDetails.getRole())
                            .employeeCode(userDetails.getEmployeeCode())
                            .factoryId(userDetails.getFactoryId())
                            .mesEnabled(mesEnabled)
                            .pqcEnabled(pqcEnabled)
                            .lpaEnabled(lpaEnabled)
                            .canBackfillPqc(userDetails.isCanBackfillPqc())
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("=== AUTH FAILED: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshToken(String refreshToken) {
        String userId = tokenProvider.validateRefreshTokenAndGetUserId(refreshToken);
        if (userId == null) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        User user = userRepository.findById(java.util.UUID.fromString(userId))
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        String newAccessToken = tokenProvider.generateAccessToken(
                user.getId(),
                user.getFactory() != null ? user.getFactory().getId() : null,
                user.getUsername(),
                user.getRole().name(),
                user.getFullName(),
                user.getEmployeeCode()
        );

        Boolean mesEnabled = true, pqcEnabled = true, lpaEnabled = true;
        if (user.getFactory() != null) {
            mesEnabled = user.getFactory().getMesEnabled() != null ? user.getFactory().getMesEnabled() : true;
            pqcEnabled = user.getFactory().getPqcEnabled() != null ? user.getFactory().getPqcEnabled() : true;
            lpaEnabled = user.getFactory().getLpaEnabled() != null ? user.getFactory().getLpaEnabled() : true;
        }

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .role(user.getRole().name())
                        .employeeCode(user.getEmployeeCode())
                        .factoryId(user.getFactory() != null ? user.getFactory().getId() : null)
                        .mesEnabled(mesEnabled)
                        .pqcEnabled(pqcEnabled)
                        .lpaEnabled(lpaEnabled)
                        .canBackfillPqc(Boolean.TRUE.equals(user.getCanBackfillPqc()))
                        .build())
                .build();
    }

    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null) {
            tokenProvider.blacklistToken(accessToken);
        }
        if (refreshToken != null) {
            tokenProvider.deleteRefreshToken(refreshToken);
        }
    }
}