import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../hooks/useProfile';

type Props = {
  profile: UserProfile;
  onRefresh: () => void;
};

export default function PendingScreen({ profile, onRefresh }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) return Alert.alert('Requerido', 'El nombre es obligatorio');
    if (!age.trim()) return Alert.alert('Requerido', 'La edad es obligatoria');

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        age: parseInt(age, 10),
        address: address.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Guardado', 'Tu perfil fue actualizado');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Estado de cuenta */}
      <View style={styles.statusCard}>
        <Ionicons name="time-outline" size={40} color="#F59E0B" />
        <Text style={styles.statusTitle}>Cuenta en revisión</Text>
        <Text style={styles.statusSubtitle}>
          Un administrador asignará tu rol pronto. Mientras tanto, completa tu perfil.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing
            ? <ActivityIndicator size="small" color="#F59E0B" />
            : <Text style={styles.retryBtnText}>↻ Verificar estado</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Formulario de perfil */}
      <Text style={styles.sectionTitle}>Tu información</Text>

      <Text style={styles.label}>Nombre completo *</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Juan Pérez"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>Edad *</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="30"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Dirección</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Calle 123, Ciudad"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>Teléfono</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+1 234 567 8900"
        placeholderTextColor="#94A3B8"
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Guardar perfil</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingBottom: 48 },
  statusCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  statusTitle: {
    fontSize: 20, fontWeight: '700', color: '#92400E',
    marginTop: 12, marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14, color: '#B45309', textAlign: 'center', lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B',
    minWidth: 140, alignItems: 'center',
  },
  retryBtnText: { color: '#F59E0B', fontWeight: '600', fontSize: 14 },
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8,
    padding: 12, fontSize: 15, color: '#1E293B', backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  logoutBtnText: { color: '#94A3B8', fontSize: 14 },
});
