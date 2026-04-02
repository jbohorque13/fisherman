import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type PendingUser = {
  id: string;
  email: string;
  full_name: string | null;
  age: number | null;
};

export default function AdminScreen() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null); // id del user en proceso

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, age')
      .eq('role', 'pending')
      .order('created_at');

    if (error) Alert.alert('Error', error.message);
    else setUsers(data ?? []);
    setLoading(false);
  };

  const assignRole = async (userId: string, role: 'integrador' | 'guia') => {
    const roleLabel = role === 'integrador' ? 'Integrador' : 'Guía';
    Alert.alert(
      'Confirmar',
      `¿Asignar como ${roleLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAssigning(userId);
            const { error } = await supabase
              .from('profiles')
              .update({ role })
              .eq('id', userId);

            setAssigning(null);

            if (error) return Alert.alert('Error', error.message);

            // Quitar de la lista local inmediatamente
            setUsers((prev) => prev.filter((u) => u.id !== userId));
          },
        },
      ]
    );
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
      <View style={styles.header}>
        <Text style={styles.title}>Panel Admin</Text>
        <TouchableOpacity onPress={loadPendingUsers}>
          <Ionicons name="refresh" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {users.length === 0
          ? 'No hay usuarios pendientes'
          : `${users.length} usuario${users.length > 1 ? 's' : ''} pendiente${users.length > 1 ? 's' : ''}`
        }
      </Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text style={styles.emptyText}>Todo al día</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.full_name ?? '(sin nombre)'}</Text>
              <Text style={styles.cardEmail}>{item.email}</Text>
              {item.age ? <Text style={styles.cardMeta}>{item.age} años</Text> : null}
            </View>

            {assigning === item.id ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.roleBtn, styles.roleBtnIntegrador]}
                  onPress={() => assignRole(item.id, 'integrador')}
                >
                  <Text style={styles.roleBtnText}>Integrador</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, styles.roleBtnGuia]}
                  onPress={() => assignRole(item.id, 'guia')}
                >
                  <Text style={styles.roleBtnText}>Guía</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => supabase.auth.signOut()}
      >
        <Ionicons name="log-out-outline" size={16} color="#94A3B8" />
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B', paddingHorizontal: 20, marginBottom: 12 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardInfo: { marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  cardEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center',
  },
  roleBtnIntegrador: { backgroundColor: '#2563EB' },
  roleBtnGuia: { backgroundColor: '#7C3AED' },
  roleBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 16,
  },
  logoutBtnText: { color: '#94A3B8', fontSize: 14 },
});
