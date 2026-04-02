import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from './src/lib/supabase';
import { useProfile } from './src/hooks/useProfile';

import LoginScreen from './src/screens/LoginScreen';
import EmailLoginScreen from './src/screens/EmailLoginScreen';
import PendingScreen from './src/screens/PendingScreen';
import AdminScreen from './src/screens/AdminScreen';
import GuiaScreen from './src/screens/GuiaScreen';
import FormScreen from './src/screens/FormScreen';
import IntegrationListScreen from './src/screens/IntegrationListScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const extractCode = (url: string) => url.match(/[?&]code=([^&\s]+)/)?.[1] ?? null;

function AppScreens() {
  const { profile, loading: profileLoading, fetchProfile } = useProfile();

  useEffect(() => {
    fetchProfile();
  }, []);

  if (profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Pending: ve pantalla de revisión con formulario de perfil
  if (!profile || profile.role === 'pending') {
    return (
      <PendingScreen
        profile={profile ?? {
          id: '', email: '', role: 'pending',
          full_name: null, age: null, address: null,
          phone: null, push_token: null,
        }}
        onRefresh={fetchProfile}
      />
    );
  }

  // Admin: panel de gestión de usuarios
  if (profile.role === 'admin') {
    return <AdminScreen />;
  }

  // Guía: su stack propio
  if (profile.role === 'guia') {
    return <GuiaScreen />;
  }

  // Integrador: app completa con tabs + modales
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      // Manejo de deep link para TestFlight / app relanzada desde OAuth
      if (!session) {
        const url = await Linking.getInitialURL();
        if (url) {
          const code = extractCode(url);
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) console.warn('exchangeCodeForSession error:', error.message);
          }
        }
      }
    };

    init();
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
          </>
        ) : (
          // Pantalla contenedora que resuelve el rol
          <Stack.Screen name="Main" component={AppScreens} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
