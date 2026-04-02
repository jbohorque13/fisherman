import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Placeholder — expandir según el rol de guía
export default function GuiaScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="compass-outline" size={56} color="#7C3AED" />
      <Text style={styles.title}>Bienvenido, Guía</Text>
      <Text style={styles.subtitle}>
        Tu panel estará disponible próximamente.
      </Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8FAFC', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  logoutBtn: { marginTop: 16, padding: 12 },
  logoutBtnText: { color: '#94A3B8', fontSize: 14 },
});
