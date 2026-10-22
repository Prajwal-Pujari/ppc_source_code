package com.mes.factory.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final Key key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;
    private final StringRedisTemplate redisTemplate;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration-ms}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs,
            StringRedisTemplate redisTemplate) {
        byte[] keyBytes = Base64.getDecoder().decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.redisTemplate = redisTemplate;
    }

    public String generateAccessToken(UUID userId, UUID factoryId, String username,
                                       String role, String fullName, String employeeCode) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .setSubject(username)
                .claim("user_id", userId.toString())
                .claim("factory_id", factoryId != null ? factoryId.toString() : null)
                .claim("role", role)
                .claim("full_name", fullName)
                .claim("employee_code", employeeCode)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        String refreshToken = Jwts.builder()
                .setSubject(userId.toString())
                .claim("token_type", "refresh")
                .claim("user_id", userId.toString())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        try {
            String redisKey = "refresh:" + refreshToken;
            redisTemplate.opsForValue().set(redisKey, userId.toString(),
                    refreshTokenExpirationMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.warn("Could not save refresh token to Redis: {}", e.getMessage());
        }
        return refreshToken;
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return !isTokenBlacklisted(token);
        } catch (MalformedJwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.debug("Expired JWT token: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public void blacklistToken(String token) {
        try {
            Claims claims = getClaims(token);
            long ttl = claims.getExpiration().getTime() - System.currentTimeMillis();
            if (ttl > 0) {
                redisTemplate.opsForValue().set("blacklist:" + token, "true", ttl, TimeUnit.MILLISECONDS);
            }
        } catch (Exception e) {
            log.warn("Could not blacklist token: {}", e.getMessage());
        }
    }

    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token));
    }

    public String validateRefreshTokenAndGetUserId(String refreshToken) {
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            return null;
        }

        // 1. Check if token is explicitly blacklisted in Redis
        if (isTokenBlacklisted(refreshToken)) {
            return null;
        }

        // 2. Fast-path lookup from Redis
        try {
            String redisKey = "refresh:" + refreshToken;
            String userId = redisTemplate.opsForValue().get(redisKey);
            if (userId != null) {
                return userId;
            }
        } catch (Exception e) {
            log.warn("Redis lookup failed for refresh token: {}", e.getMessage());
        }

        // 3. Fallback: Validate as signed JWT if Redis was restarted or cache was evicted
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(refreshToken)
                    .getBody();

            String tokenType = claims.get("token_type", String.class);
            if ("refresh".equals(tokenType)) {
                String userId = claims.get("user_id", String.class);
                if (userId == null) {
                    userId = claims.getSubject();
                }
                if (userId != null && claims.getExpiration() != null) {
                    long remainingMs = claims.getExpiration().getTime() - System.currentTimeMillis();
                    if (remainingMs > 0) {
                        try {
                            redisTemplate.opsForValue().set("refresh:" + refreshToken, userId,
                                    remainingMs, TimeUnit.MILLISECONDS);
                        } catch (Exception ignored) {}
                    }
                    return userId;
                }
            }
        } catch (Exception e) {
            log.debug("Refresh token JWT validation failed: {}", e.getMessage());
        }

        return null;
    }

    public void deleteRefreshToken(String refreshToken) {
        if (refreshToken != null) {
            blacklistToken(refreshToken);
            try {
                redisTemplate.delete("refresh:" + refreshToken);
            } catch (Exception ignored) {}
        }
    }
}
