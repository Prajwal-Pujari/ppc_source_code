package com.mes.factory.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class IotSpeakRequest {
    @NotBlank(message = "IP Address is required")
    private String ipAddress;
    
    @NotBlank(message = "Text is required")
    private String text;
}
