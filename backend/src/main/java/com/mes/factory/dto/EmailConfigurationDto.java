package com.mes.factory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailConfigurationDto {
    private UUID id;
    private UUID factoryId;
    private String host;
    private Integer port;
    private String username;
    private String password;
    private String encryptionType;
    private String senderEmail;
    private Boolean isActive;
}
