package com.mes.factory.service;

import com.mes.factory.dto.response.NotificationMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a notification to all users in a specific factory.
     */
    public void notifyFactory(Long factoryId, String topic, NotificationMessage message) {
        String destination = String.format("/topic/factory/%d/%s", factoryId, topic);
        log.debug("Sending notification to {}: {}", destination, message.getTitle());
        messagingTemplate.convertAndSend(destination, message);
    }

    /**
     * Send a notification to a specific user.
     */
    public void notifyUser(Long userId, NotificationMessage message) {
        String destination = String.format("/queue/user/%d/notifications", userId);
        log.debug("Sending notification to user {}: {}", userId, message.getTitle());
        messagingTemplate.convertAndSend(destination, message);
    }
}
