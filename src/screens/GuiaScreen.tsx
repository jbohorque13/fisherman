import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../lib/supabase';
import { useTheme } from '../lib/theme';

export default function GuiaScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Ionicons name="compass-outline" size={56} color={theme.purple} />
      <Text style={styles.title}>Bienvenido, Guía</Text>
      <Text style={styles.subtitle}>Tu panel estará disponible próximamente.</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()}>
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: theme.background, gap: 12 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text },
    subtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
    logoutBtn: { marginTop: 16, padding: 12 },
    logoutBtnText: { color: theme.textMuted, fontSize: 14 },
  });
}
