import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useUnlockModalStore } from '@/store/unlockModalStore';

export function useInspectionUnlockMonitor() {
  const user = useAuthStore(s => s.user);
  const addNotification = useNotificationStore(s => s.addNotification);
  const openModal = useUnlockModalStore(s => s.openModal);

  useEffect(() => {
    if (!user?.id) return;

    // Request notification permission if not yet decided
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const checkLocks = () => {
      try {
        const raw = localStorage.getItem('mes_inspection_locks');
        if (!raw) return;
        const locks: Record<string, {
          opId: string;
          opName: string;
          serialNumber: string;
          firstInspectorId?: string;
          unlockTimestamp: number;
          slotNumber: number;
          notified?: boolean;
        }> = JSON.parse(raw);

        let changed = false;
        const now = Date.now();

        Object.keys(locks).forEach((opId) => {
          const lock = locks[opId];
          // Prune stale records older than 4 hours
          if (now - lock.unlockTimestamp > 4 * 3600 * 1000) {
            delete locks[opId];
            changed = true;
            return;
          }

          if (!lock.notified && now >= lock.unlockTimestamp) {
            lock.notified = true;
            changed = true;

            // Check if user is already actively on the inspection page for this operation
            const isAlreadyOnThisOp = typeof window !== 'undefined' &&
              window.location.pathname.includes('/inspection') &&
              window.location.search.includes(lock.opId);

            // 1. Alert in Notification list
            addNotification(
              'Hourly Inspection Ready',
              `Next hourly inspection is unlocked for ${lock.opName} (${lock.serialNumber}). Click to begin inspection.`,
              'info',
              `/inspection?opId=${lock.opId}`
            );

            // 2. Interactive Popup Modal (only if on another page/tab to avoid disturbing active entry)
            if (!isAlreadyOnThisOp) {
              openModal({
                opId: lock.opId,
                opName: lock.opName,
                serialNumber: lock.serialNumber,
                slotNumber: lock.slotNumber,
              });
            }

            // 3. Desktop Notification (if permitted)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('MES Inspection Ready', {
                body: `Hour ${lock.slotNumber} is unlocked for ${lock.opName} (${lock.serialNumber})`,
              });
            }
          }
        });

        if (changed) {
          localStorage.setItem('mes_inspection_locks', JSON.stringify(locks));
        }
      } catch (err) {
        console.error('Error checking inspection locks:', err);
      }
    };

    const interval = setInterval(checkLocks, 3000);
    return () => clearInterval(interval);
  }, [user?.id, addNotification, openModal]);
}
