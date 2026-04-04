import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configurar comportamiento en primer plano (seguro llamarlo aquí, es síncrono)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Inicialización ───────────────────────────────────────────────────────────

/**
 * Configura el canal de Android y registra el push token del usuario.
 * Debe llamarse una sola vez, desde App.tsx.
 */
export async function initNotifications(): Promise<void> {
  // Canal Android dentro de una función async, no a nivel de módulo
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Fisherman',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  await registerPushToken();
}

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) {
    console.log('[Push] registerPushToken: no es dispositivo físico, se omite');
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[Push] Permisos de notificación no concedidos:', finalStatus);
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn('[Push] projectId no encontrado en Constants.expoConfig');
    return;
  }

  try {
    console.log('[Push] Obteniendo token con projectId:', projectId);
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Token obtenido:', token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[Push] Usuario actual:', user?.id ?? 'null', userError?.message ?? '');

    if (user) {
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('push_token', token)
        .neq('id', user.id);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);

      console.log('[Push] Token guardado en perfil:', updateError?.message ?? 'OK');
    }
  } catch (e) {
    console.warn('[Push] registerPushToken falló:', e);
  }
}

export async function clearPushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', user.id);
    }
  } catch (e) {
    console.warn('clearPushToken failed:', e);
  }
}

// ─── Primitiva interna ────────────────────────────────────────────────────────

async function sendPush(
  userId: string,
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await supabase.from('notificaciones').insert({ user_id: userId, titulo, mensaje });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .maybeSingle();

  console.log('[Push] userId:', userId, '| token:', profile?.push_token ?? 'NULL', '| error:', profileError?.message ?? 'none');

  if (!profile?.push_token) {
    console.warn('[Push] Abortando: sin push_token para userId', userId);
    return;
  }

  const body = {
    to: profile.push_token,
    title: titulo,
    body: mensaje,
    data: data ?? {},
    sound: 'default',
    priority: 'high',
  };

  console.log('[Push] Enviando a Expo:', JSON.stringify(body));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  console.log('[Push] Respuesta Expo:', JSON.stringify(json));
}

// ─── Acciones de negocio ──────────────────────────────────────────────────────

export async function notifyAdminsUserWaiting(userEmail: string): Promise<void> {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  console.log('[Push] Admins encontrados:', admins?.length ?? 0);

  await Promise.all(
    (admins ?? []).map((a) =>
      sendPush(
        a.id,
        'Usuario esperando rol',
        `${userEmail} sigue esperando que le asignes un rol.`,
        { type: 'user_waiting', email: userEmail },
      ),
    ),
  );
}

export async function notifyAdminsNewUser(newUserEmail: string): Promise<void> {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  await Promise.all(
    (admins ?? []).map((a) =>
      sendPush(
        a.id,
        'Nuevo usuario registrado',
        `${newUserEmail} necesita que le asignes un rol.`,
        { type: 'new_user', email: newUserEmail },
      ),
    ),
  );
}

export async function notifyUserPendingRole(userId: string): Promise<void> {
  await sendPush(
    userId,
    'Cuenta en revisión',
    'Tu cuenta fue creada. Un administrador te asignará un rol pronto.',
    { type: 'pending_role' },
  );
}

export async function notifyUserRoleAssigned(
  userId: string,
  role: 'integrador' | 'guia',
): Promise<void> {
  const label = role === 'integrador' ? 'Integrador' : 'Guía';
  await sendPush(
    userId,
    '¡Tu rol fue asignado!',
    `Ya puedes acceder a la app como ${label}.`,
    { type: 'role_assigned', role },
  );
}

export async function notifyGuidePersonAssigned(
  guideId: string,
  personName: string,
): Promise<void> {
  await sendPush(
    guideId,
    'Nueva persona asignada',
    `${personName} fue asignado a tu grupo para integrar.`,
    { type: 'assigned_person', person_name: personName },
  );
}

export async function notifyIntegradorRejected(
  integradorId: string,
  personName: string,
  reason: string,
): Promise<void> {
  await sendPush(
    integradorId,
    'Asignación rechazada',
    `El guía rechazó a ${personName}: "${reason}"`,
    { type: 'assignment_rejected', person_name: personName },
  );
}

export async function notifyIntegradorIntegrated(
  integradorId: string,
  personName: string,
): Promise<void> {
  await sendPush(
    integradorId,
    '¡Persona integrada!',
    `${personName} fue integrado exitosamente al grupo.`,
    { type: 'person_integrated', person_name: personName },
  );
}
