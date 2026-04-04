import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { initNotifications } from '../lib/notifications';

/**
 * Usado UNA SOLA VEZ en App.tsx.
 * Inicializa el canal Android, registra el push token y configura los listeners.
 */
export function useAppNotifications(
  onTap?: (data: Record<string, unknown>) => void,
): void {
  const notifListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    initNotifications().catch(console.warn);

    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground: el handler global ya muestra la notificación
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        onTap?.(data);
      },
    );

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
