import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

export function useWebSocket() {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const user = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!user?.factoryId) return;

    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.origin}/ws`;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);
        // Subscribe to factory-wide topics
        client.subscribe(`/topic/factory/${user.factoryId}/po-updates`, (msg) => {
          const data = JSON.parse(msg.body);
          addNotification('PO Update', data.message || `Event: ${data.eventType}`, data.type || 'info');
        });

        client.subscribe(`/topic/factory/${user.factoryId}/gauge-updates`, (msg) => {
          const data = JSON.parse(msg.body);
          addNotification('Gauge Update', data.message || `Event: ${data.eventType}`, data.type || 'info');
        });

        // Subscribe to personal notifications
        client.subscribe(`/queue/user/${user.id}/notifications`, (msg) => {
          const data = JSON.parse(msg.body);
          addNotification(data.title || 'New Assignment', data.message || 'You have a new notification', data.type || 'info');
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message']);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [user?.factoryId, user?.id, addNotification]);

  const subscribe = useCallback((topic: string, callback: (data: any) => void) => {
    if (clientRef.current?.connected) {
      return clientRef.current.subscribe(topic, (msg) => {
        callback(JSON.parse(msg.body));
      });
    }
    return null;
  }, []);

  return { connected, subscribe };
}
