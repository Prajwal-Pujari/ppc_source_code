package com.mes.factory.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class IotTriggerRequest {
    @NotBlank(message = "IP Address is required")
    private String ipAddress;
    
    private String sound;
}
