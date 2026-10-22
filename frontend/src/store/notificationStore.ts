import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  isRead: boolean;
  link?: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (title: string, message: string, type: Notification['type'], link?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      addNotification: (title, message, type, link) =>
        set((s) => ({
          notifications: [
            { 
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Date.now().toString(36), 
              title, 
              message, 
              type, 
              link,
              timestamp: Date.now(), 
              isRead: false 
            },
            ...s.notifications,
          ].slice(0, 50), // keep last 50
        })),
      markAsRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        })),
      markAllAsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        })),
      dismissNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
      clearAll: () => set({ notifications: [] }),
    }),
    { name: 'mes-notifications' }
  )
);

