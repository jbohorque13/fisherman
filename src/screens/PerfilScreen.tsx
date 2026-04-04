import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import AvatarPicker from '../components/AvatarPicker';
import { useTheme } from '../lib/theme';

export default function PerfilScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [userId, setUserId] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPerfil();
  }, []);

  const loadPerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);
    setEmail(user.email ?? '');

    const { data } = await supabase
      .from('profiles')
      .select('nombre, apellido, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setNombre(data.nombre ?? '');
      setApellido(data.apellido ?? '');
      setAvatarUrl(data.avatar_url ?? null);
    } else {
      const meta = user.user_metadata;
      setNombre(meta?.full_name?.split(' ')[0] ?? '');
      setApellido(meta?.full_name?.split(' ').slice(1).join(' ') ?? '');
    }

    setLoading(false);
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Requerido', 'El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email,
        nombre,
        apellido,
      });
      if (error) throw error;
      Alert.alert('Guardado', 'Perfil actualizado correctamente');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi Perfil</Text>

      <View style={styles.avatarContainer}>
        <AvatarPicker
          userId={userId}
          avatarUrl={avatarUrl}
          size={90}
          accentColor={theme.primary}
          onUploaded={(url) => setAvatarUrl(url)}
        />
      </View>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre"
      />

      <Text style={styles.label}>Apellido</Text>
      <TextInput
        style={styles.input}
        value={apellido}
        onChangeText={setApellido}
        placeholder="Apellido"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={email}
        editable={false}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={guardar} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Guardar cambios</Text>
        )}
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
    title: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 24 },
    avatarContainer: { alignItems: 'center', marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 14 },
    input: {
      borderWidth: 1,
      borderColor: theme.borderInput,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: theme.text,
    },
    inputDisabled: { backgroundColor: theme.surfaceAlt, color: theme.textMuted },
    saveBtn: {
      backgroundColor: theme.primary,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 28,
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.dangerSurface,
    },
    logoutText: { color: theme.danger, fontSize: 15, fontWeight: '600' },
  });
}
