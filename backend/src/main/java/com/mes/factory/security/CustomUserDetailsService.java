package com.mes.factory.security;

import com.mes.factory.entity.postgres.User;
import com.mes.factory.repository.postgres.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return CustomUserDetails.builder()
                .userId(user.getId())
                .factoryId(user.getFactory() != null ? user.getFactory().getId() : null)
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .employeeCode(user.getEmployeeCode())
                .active(user.getIsActive())
                .isCalibrationWorker(Boolean.TRUE.equals(user.getIsCalibrationWorker()))
                .build();
    }
}
