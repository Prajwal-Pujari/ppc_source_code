package com.mes.factory.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.factory.entity.postgres.ActivityLog;
import com.mes.factory.repository.postgres.ActivityLogRepository;
import com.mes.factory.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    private final ActivityLogRepository activityLogRepository;
    private final ObjectMapper objectMapper;

    public AuditAspect(ActivityLogRepository activityLogRepository, ObjectMapper objectMapper) {
        this.activityLogRepository = activityLogRepository;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        Object result = joinPoint.proceed();

        try {
            UUID entityId = extractEntityId(joinPoint);
            CustomUserDetails userDetails = getCurrentUser();
            String ipAddress = getClientIp();
            String userAgent = getUserAgent();

            ActivityLog activityLog = ActivityLog.builder()
                    .entityType(auditable.entityType())
                    .entityId(entityId)
                    .action(auditable.action())
                    .performedAt(OffsetDateTime.now())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();

            if (userDetails != null) {
                activityLog.setNewValue(Map.of("result", "success"));
            }

            activityLogRepository.save(activityLog);
        } catch (Exception e) {
            log.warn("Failed to save audit log for {}.{}: {}",
                    auditable.entityType(), auditable.action(), e.getMessage());
        }

        return result;
    }

    private UUID extractEntityId(ProceedingJoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        for (Object arg : args) {
            if (arg instanceof UUID) {
                return (UUID) arg;
            }
        }
        return UUID.randomUUID();
    }

    private CustomUserDetails getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return (CustomUserDetails) auth.getPrincipal();
        }
        return null;
    }

    private String getClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String forwarded = request.getHeader("X-Forwarded-For");
                return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
            }
        } catch (Exception e) {
            log.debug("Could not extract IP address");
        }
        return null;
    }

    private String getUserAgent() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                return attrs.getRequest().getHeader("User-Agent");
            }
        } catch (Exception e) {
            log.debug("Could not extract User-Agent");
        }
        return null;
    }
}
