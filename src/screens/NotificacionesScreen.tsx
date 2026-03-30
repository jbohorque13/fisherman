import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Notificacion } from '../types';

export default function NotificacionesScreen() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificaciones();
  }, []);

  const loadNotificaciones = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotificaciones(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const marcarLeida = async (id: string) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const eliminar = (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta notificación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('notificaciones').delete().eq('id', id);
          setNotificaciones((prev) => prev.filter((n) => n.id !== id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificaciones</Text>

      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
            <Text style={styles.empty}>Sin notificaciones</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.leida && styles.cardUnread]}
            onPress={() => marcarLeida(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                {!item.leida && <View style={styles.dot} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.titulo}</Text>
                  <Text style={styles.cardMsg}>{item.mensaje}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => eliminar(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { color: '#94A3B8', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardUnread: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  cardLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardMsg: { fontSize: 13, color: '#475569', marginTop: 3 },
  cardDate: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  deleteBtn: { padding: 4, marginLeft: 8 },
});
