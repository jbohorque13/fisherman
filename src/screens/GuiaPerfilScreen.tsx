import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { formatPhoneInput, isValidPhone } from '../lib/phoneUtils';
import AvatarPicker from '../components/AvatarPicker';

export default function GuiaPerfilScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPerfil(); }, []);

  const loadPerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email ?? '');
    const { data } = await supabase.from('profiles').select('full_name, phone, age, address, avatar_url').eq('id', user.id).maybeSingle();
    if (data) {
      setFullName(data.full_name ?? '');
      setPhone(formatPhoneInput(data.phone ?? ''));
      setAge(data.age ? String(data.age) : '');
      setAddress(data.address ?? '');
      setAvatarUrl(data.avatar_url ?? null);
    }
    setLoading(false);
  };

  const guardar = async () => {
    if (!fullName.trim()) return Alert.alert('Requerido', 'El nombre es obligatorio');
    if (!isValidPhone(phone)) return Alert.alert('Requerido', 'El teléfono de WhatsApp es obligatorio.\nEjemplo: +54 911 1234 5678');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(), phone: phone.trim() || null,
      age: age ? parseInt(age) : null, address: address.trim() || null,
    }).eq('id', user.id);
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Guardado', 'Perfil actualizado');
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.purple} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarContainer}>
        <AvatarPicker userId={userId} avatarUrl={avatarUrl} size={90} accentColor={theme.purple} onUploaded={(url) => setAvatarUrl(url)} />
        <Text style={styles.roleLabel}>Guía</Text>
      </View>

      <Text style={styles.label}>Nombre completo *</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Juan Pérez" placeholderTextColor={theme.textMuted} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

      <Text style={styles.label}>Teléfono WhatsApp *</Text>
      <TextInput style={styles.input} value={phone} onChangeText={(v) => setPhone(formatPhoneInput(v))} placeholder="+54 9 11 1234 5678" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" maxLength={20} />

      <Text style={styles.label}>Edad</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="30" placeholderTextColor={theme.textMuted} keyboardType="numeric" />

      <Text style={styles.label}>Dirección</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Calle 123, Ciudad" placeholderTextColor={theme.textMuted} />

      <TouchableOpacity style={styles.saveBtn} onPress={guardar} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar cambios</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion}>
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.surface },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24, paddingBottom: 48 },
    avatarContainer: { alignItems: 'center', marginBottom: 28, gap: 10 },
    roleLabel: {
      fontSize: 13, fontWeight: '600', color: theme.purple,
      backgroundColor: theme.purpleSurface, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10,
    },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 14 },
    input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, fontSize: 15, color: theme.text, backgroundColor: theme.surface },
    inputDisabled: { backgroundColor: theme.surfaceAlt, color: theme.textMuted },
    saveBtn: { backgroundColor: theme.purple, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 28 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.dangerBorder },
    logoutText: { color: theme.danger, fontSize: 15, fontWeight: '600' },
  });
}
