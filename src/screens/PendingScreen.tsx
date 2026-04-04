import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Keyboard, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import { notifyAdminsUserWaiting } from '../lib/notifications';
import { UserProfile } from '../hooks/useProfile';
import { useTheme } from '../lib/theme';

type Props = {
  profile: UserProfile;
  onRefresh: () => void;
};

export default function PendingScreen({ profile, onRefresh }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
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
    await Promise.all([
      onRefresh(),
      notifyAdminsUserWaiting(profile.email).catch(() => {}),
    ]);
    setRefreshing(false);
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={Platform.OS === 'ios' ? 16 : 32}
      showsVerticalScrollIndicator={false}
    >
      {/* Estado de cuenta */}
      <View style={styles.statusCard}>
        <Ionicons name="time-outline" size={40} color={theme.warning} />
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
            ? <ActivityIndicator size="small" color={theme.warning} />
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
        placeholderTextColor={theme.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>Edad *</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="30"
        placeholderTextColor={theme.textMuted}
        keyboardType="numeric"
        returnKeyType="next"
      />

      <Text style={styles.label}>Dirección</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Calle 123, Ciudad"
        placeholderTextColor={theme.textMuted}
        returnKeyType="next"
      />

      <Text style={styles.label}>Teléfono</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+1 234 567 8900"
        placeholderTextColor={theme.textMuted}
        keyboardType="phone-pad"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Guardar perfil</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => signOut()}
      >
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 24, paddingBottom: 48 },
    statusCard: {
      backgroundColor: theme.warningSurface,
      borderWidth: 1,
      borderColor: theme.warningBorder,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 32,
    },
    statusTitle: {
      fontSize: 20, fontWeight: '700', color: theme.warningText,
      marginTop: 12, marginBottom: 8,
    },
    statusSubtitle: {
      fontSize: 14, color: '#B45309', textAlign: 'center', lineHeight: 20,
    },
    retryBtn: {
      marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 8, borderWidth: 1, borderColor: theme.warning,
      minWidth: 140, alignItems: 'center',
    },
    retryBtnText: { color: theme.warning, fontWeight: '600', fontSize: 14 },
    sectionTitle: {
      fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 16,
    },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8,
      padding: 12, fontSize: 15, color: theme.text, backgroundColor: theme.surface,
    },
    saveBtn: {
      backgroundColor: theme.primary, borderRadius: 8,
      padding: 14, alignItems: 'center', marginTop: 28,
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    logoutBtn: {
      padding: 14, alignItems: 'center', marginTop: 12,
    },
    logoutBtnText: { color: theme.textMuted, fontSize: 14 },
  });
}
