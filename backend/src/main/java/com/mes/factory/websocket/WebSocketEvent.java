package com.mes.factory.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebSocketEvent {

    private String eventType;
    private UUID entityId;
    private String entityType;
    private Object data;
    
    // Rich Notification fields
    private String title;
    private String message;
    private String type; // info, success, warning, error
    @Builder.Default
    private Instant timestamp = Instant.now();
}
