package com.mes.factory.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class CustomUserDetails implements UserDetails {

    private final UUID userId;
    private final UUID factoryId;
    private final String username;
    private final String password;
    private final String role;
    private final String fullName;
    private final String employeeCode;
    private final boolean active;
    private final boolean isCalibrationWorker;

    // Manual constructor instead of Lombok
    public CustomUserDetails(UUID userId, UUID factoryId, String username, String password,
                              String role, String fullName, String employeeCode, boolean active, boolean isCalibrationWorker) {
        this.userId = userId;
        this.factoryId = factoryId;
        this.username = username;
        this.password = password;
        this.role = role;
        this.fullName = fullName;
        this.employeeCode = employeeCode;
        this.active = active;
        this.isCalibrationWorker = isCalibrationWorker;
    }

    // Manual getters (no Lombok conflict)
    public UUID getUserId() { return userId; }
    public UUID getFactoryId() { return factoryId; }
    public String getRole() { return role; }
    public String getFullName() { return fullName; }
    public String getEmployeeCode() { return employeeCode; }
    public boolean isCalibrationWorker() { return isCalibrationWorker; }

    // Manual builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID userId;
        private UUID factoryId;
        private String username;
        private String password;
        private String role;
        private String fullName;
        private String employeeCode;
        private boolean active;
        private boolean isCalibrationWorker;

        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder factoryId(UUID factoryId) { this.factoryId = factoryId; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder password(String password) { this.password = password; return this; }
        public Builder role(String role) { this.role = role; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder employeeCode(String employeeCode) { this.employeeCode = employeeCode; return this; }
        public Builder active(boolean active) { this.active = active; return this; }
        public Builder isCalibrationWorker(boolean isCalibrationWorker) { this.isCalibrationWorker = isCalibrationWorker; return this; }

        public CustomUserDetails build() {
            return new CustomUserDetails(userId, factoryId, username, password,
                    role, fullName, employeeCode, active, isCalibrationWorker);
        }
    }

    // UserDetails interface methods
    @Override public String getUsername() { return username; }
    @Override public String getPassword() { return password; }
    @Override public boolean isEnabled() { return active; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
}