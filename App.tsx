import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { supabase } from './src/lib/supabase';
import { useTheme } from './src/lib/theme';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { useProfile } from './src/hooks/useProfile';
import { useAppNotifications } from './src/hooks/useAppNotifications';
import { registerPushToken } from './src/lib/notifications';

import LoginScreen from './src/screens/LoginScreen';
import EmailLoginScreen from './src/screens/EmailLoginScreen';
import PendingScreen from './src/screens/PendingScreen';
import AdminScreen from './src/screens/AdminScreen';
import GuiaTabNavigator from './src/navigation/GuiaTabNavigator';
import GuiaOnboardingScreen from './src/screens/GuiaOnboardingScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import FormScreen from './src/screens/FormScreen';
import IntegrationListScreen from './src/screens/IntegrationListScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { RootStackParamList } from './src/types';

// Mantener el splash nativo visible hasta que estemos listos
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();
const extractCode = (url: string) => url.match(/[?&]code=([^&\s]+)/)?.[1] ?? null;


function AppScreens() {
  const { profile, loading: profileLoading, fetchProfile } = useProfile();
  useAppNotifications();

  useEffect(() => { fetchProfile(); }, []);

  // Mientras carga el perfil no mostramos nada: AnimatedSplash cubre la pantalla
  if (profileLoading) return null;

  if (!profile || profile.role === 'pending') {
    return (
      <PendingScreen
        profile={profile ?? {
          id: '', email: '', role: 'pending',
          full_name: null, age: null, address: null,
          phone: null, push_token: null,
          nombre: '', apellido: '', edad: 0,
          celular: '', dias_disponibles: [],
          tipo_grupo: 'chicas', modalidad: 'online',
        }}
        onRefresh={fetchProfile}
      />
    );
  }

  if (profile.role === 'admin') return <AdminScreen />;

  if (profile.role === 'guia') {
    if (!profile.phone) {
      return <GuiaOnboardingScreen profile={profile} onComplete={fetchProfile} />;
    }
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GuiaHome" component={GuiaTabNavigator} />
        <Stack.Screen name="PersonDetail" component={PersonDetailScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="Form"
        component={FormScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="IntegrationList" component={IntegrationListScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const theme = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') {
        registerPushToken().catch(console.warn);
      }
    });

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      if (!session && Platform.OS === 'android') {
        const url = await Linking.getInitialURL();
        if (url) {
          const code = extractCode(url);
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) console.warn('exchangeCodeForSession error:', error.message);
          }
        }
      }

      // Ocultar splash nativo una vez que JS está listo
      await SplashScreen.hideAsync();
    };

    init();
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <StatusBar style={theme.statusBar} translucent backgroundColor="transparent" />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
          <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.background, card: theme.surface, text: theme.text, border: theme.border, primary: theme.primary } }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!session ? (
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
                </>
              ) : (
                <Stack.Screen name="Main" component={AppScreens} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
      {/* AnimatedSplash como overlay: el app carga por debajo mientras la animación corre */}
      {!animDone && <AnimatedSplash onFinish={() => setAnimDone(true)} />}
    </GestureHandlerRootView>
  );
}

