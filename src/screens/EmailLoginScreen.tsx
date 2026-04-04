import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types';
import { useTheme } from '../lib/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailLogin'>;
};

export default function EmailLoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const validate = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email inválido', 'Ingresa un email válido');
      return false;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Contraseña inválida', 'Mínimo 6 caracteres');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange en App.tsx navega automáticamente
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Cuenta creada', 'Revisa tu email para confirmar tu cuenta.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Algo salió mal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={theme.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>
              {mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchBtn}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        <Text style={styles.switchText}>
          {mode === 'login'
            ? '¿No tenés cuenta? Registrate'
            : '¿Ya tenés cuenta? Iniciá sesión'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1, justifyContent: 'center',
      padding: 24, backgroundColor: theme.surface,
    },
    backBtn: { position: 'absolute', top: 60, left: 24 },
    backText: { color: theme.primary, fontSize: 15 },
    title: {
      fontSize: 28, fontWeight: '700', color: theme.text,
      marginBottom: 32,
    },
    input: {
      borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8,
      padding: 13, fontSize: 15, color: theme.text,
      marginBottom: 14, backgroundColor: theme.background,
    },
    button: {
      backgroundColor: theme.primary, borderRadius: 8,
      padding: 15, alignItems: 'center', marginTop: 4,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    switchBtn: { marginTop: 20, alignItems: 'center' },
    switchText: { color: theme.primary, fontSize: 14 },
  });
}
