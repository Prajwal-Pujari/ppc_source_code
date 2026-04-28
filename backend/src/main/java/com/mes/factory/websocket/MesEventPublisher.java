package com.mes.factory.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class MesEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(MesEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public MesEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishPoUpdate(UUID factoryId, Object payload) {
        String topic = "/topic/factory/" + factoryId + "/po-updates";
        log.debug("Publishing PO update to {}", topic);
        messagingTemplate.convertAndSend(topic, payload);
    }

    public void publishGaugeUpdate(UUID factoryId, Object payload) {
        String topic = "/topic/factory/" + factoryId + "/gauge-updates";
        log.debug("Publishing gauge update to {}", topic);
        messagingTemplate.convertAndSend(topic, payload);
    }

    public void publishWorkerNotification(UUID userId, Object payload) {
        String destination = "/queue/user/" + userId + "/notifications";
        log.debug("Publishing worker notification to {}", destination);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
