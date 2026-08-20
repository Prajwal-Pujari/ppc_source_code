package com.mes.factory.service;

import com.mes.factory.dto.EmailConfigurationDto;
import com.mes.factory.entity.postgres.EmailConfiguration;
import com.mes.factory.entity.postgres.Factory;
import com.mes.factory.repository.postgres.EmailConfigurationRepository;
import com.mes.factory.repository.postgres.FactoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.mail.MessagingException;

import java.util.Properties;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailConfigurationService {

    private final EmailConfigurationRepository emailConfigurationRepository;
    private final FactoryRepository factoryRepository;

    @Transactional(readOnly = true)
    public EmailConfigurationDto getConfiguration(UUID factoryId) {
        return emailConfigurationRepository.findByFactoryId(factoryId)
                .map(this::mapToDto)
                .orElse(null);
    }

    @Transactional
    public EmailConfigurationDto saveConfiguration(UUID factoryId, EmailConfigurationDto dto) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new RuntimeException("Factory not found"));

        EmailConfiguration config = emailConfigurationRepository.findByFactoryId(factoryId)
                .orElseGet(() -> EmailConfiguration.builder().factory(factory).build());

        config.setHost(dto.getHost());
        config.setPort(dto.getPort());
        config.setUsername(dto.getUsername());
        
        // Only update password if a new one is provided (it won't be sent back in GET requests usually, 
        // but for simplicity here we assume if it's not null/empty, we update it)
        if (dto.getPassword() != null && !dto.getPassword().trim().isEmpty()) {
            config.setPassword(dto.getPassword());
        }
        
        config.setEncryptionType(dto.getEncryptionType());
        config.setSenderEmail(dto.getSenderEmail());
        
        if (dto.getIsActive() != null) {
            config.setIsActive(dto.getIsActive());
        }

        EmailConfiguration saved = emailConfigurationRepository.save(config);
        return mapToDto(saved);
    }

    public void testConnection(UUID factoryId, String testEmailAddress) {
        EmailConfiguration config = emailConfigurationRepository.findByFactoryId(factoryId)
                .orElseThrow(() -> new RuntimeException("Email configuration not found for this factory."));

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getHost());
        mailSender.setPort(config.getPort());
        mailSender.setUsername(config.getUsername());
        mailSender.setPassword(config.getPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        
        if ("TLS".equalsIgnoreCase(config.getEncryptionType())) {
            props.put("mail.smtp.starttls.enable", "true");
        } else if ("SSL".equalsIgnoreCase(config.getEncryptionType())) {
            props.put("mail.smtp.ssl.enable", "true");
        }
        
        props.put("mail.debug", "false");
        props.put("mail.smtp.connectiontimeout", "5000"); // 5 seconds
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        try {
            mailSender.testConnection();
            
            // Optionally actually send an email if a test address is provided
            if (testEmailAddress != null && !testEmailAddress.isEmpty()) {
                org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
                message.setFrom(config.getSenderEmail());
                message.setTo(testEmailAddress);
                message.setSubject("AQS PQC - Test Connection Successful");
                message.setText("Your AQS PQC email configuration is working perfectly!");
                mailSender.send(message);
            }
        } catch (MessagingException e) {
            log.error("Failed to connect to SMTP server: {}", e.getMessage());
            throw new RuntimeException("Failed to connect to SMTP server. Please check your credentials and network settings.", e);
        } catch (Exception e) {
            log.error("Failed to send test email: {}", e.getMessage());
            throw new RuntimeException("Failed to send test email: " + e.getMessage(), e);
        }
    }

    private EmailConfigurationDto mapToDto(EmailConfiguration entity) {
        return EmailConfigurationDto.builder()
                .id(entity.getId())
                .factoryId(entity.getFactory().getId())
                .host(entity.getHost())
                .port(entity.getPort())
                .username(entity.getUsername())
                // Do not send password back in real production, but for our prototype we can send a dummy value or mask it
                .password("********") 
                .encryptionType(entity.getEncryptionType())
                .senderEmail(entity.getSenderEmail())
                .isActive(entity.getIsActive())
                .build();
    }
}
