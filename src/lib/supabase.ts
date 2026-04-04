import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// In-memory cache ensures PKCE verifier is always available during OAuth exchange.
const memoryCache: Record<string, string> = {};

const secureStoreAdapter = {
  getItem: async (key: string) => {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (_) {
      // iOS lanza "User interaction is not allowed" cuando el dispositivo
      // está bloqueado y Supabase intenta refrescar el token en background.
      return memoryCache[key] ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    memoryCache[key] = value;
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    delete memoryCache[key];
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

/**
 * Cierra sesión limpiando primero el push token del perfil para que
 * otro usuario que inicie sesión en el mismo dispositivo no herede el token.
 */
export async function signOut(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', user.id);
    }
  } catch (_) {
    // Continuar con signOut aunque falle la limpieza
  }
  await supabase.auth.signOut();
}
