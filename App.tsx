import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import FormScreen from './src/screens/FormScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const extractCode = (url: string) => url.match(/[?&]code=([^&\s]+)/)?.[1] ?? null;

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

      // Solo para cuando iOS/Android relanza la app desde un deep link (ej. TestFlight)
      // En foreground, openAuthSessionAsync en LoginScreen maneja el exchange
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
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Form"
              component={FormScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
