import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types';
import { useTheme } from '../lib/theme';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      const redirectTo = makeRedirectUri({ native: 'fisherman://' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No se obtuvo URL de autenticación');

      const exchangeFromUrl = async (url: string) => {
        console.log('url', url);
        const code = url.match(/[?&]code=([^&\s#]+)/)?.[1].replace('%23', '');
        console.log('code', code);
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          console.log('exchangeError', exchangeError);
          if (exchangeError) Alert.alert('Error', exchangeError.message);
        }
      };

      if (Platform.OS === 'android') {
        // Android: openAuthSessionAsync devuelve 'dismiss' cuando el deep link
        // regresa por intent. Usamos el listener de Linking para capturar el código.
        const subscription = Linking.addEventListener('url', ({ url }) => {
          subscription.remove();
          WebBrowser.dismissBrowser();
          exchangeFromUrl(url);
        });

        const result = await WebBrowser.openAuthSessionAsync(data.url, 'fisherman://');
        if (result.type !== 'success') {
          // Usuario canceló, limpiar listener
          subscription.remove();
        }
      } else {
        // iOS: openAuthSessionAsync devuelve 'success' con la URL directamente.
        // NO usar Linking.addEventListener para evitar doble intercambio.
        const result = await WebBrowser.openAuthSessionAsync(data.url, 'fisherman://');
        if (result.type === 'success' && result.url) {
          await exchangeFromUrl(result.url);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>fisherman</Text>
      <Text style={styles.subtitle}>Encuentra grupos o integra personas. </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={signInWithGoogle}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continuar con Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonOutline}
        onPress={() => navigation.navigate('EmailLogin')}
        disabled={loading}
      >
        <Text style={styles.buttonOutlineText}>Continuar con Email</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: theme.surface,
    },
    title: {
      fontSize: 36,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 48,
    },
    button: {
      backgroundColor: theme.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonOutline: {
      borderWidth: 1.5,
      borderColor: theme.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
      marginTop: 12,
    },
    buttonOutlineText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
