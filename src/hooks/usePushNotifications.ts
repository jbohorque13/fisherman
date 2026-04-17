import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '../lib/notifications';

export function usePushNotifications(
  onTap?: (data: Record<string, unknown>) => void,
) {
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerPushToken();

    // Notificación recibida con la app abierta (foreground)
    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // El handler global ya la muestra; aquí se puede actualizar badge/lista si se necesita
    });

    // Usuario tocó la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      onTap?.(data);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
