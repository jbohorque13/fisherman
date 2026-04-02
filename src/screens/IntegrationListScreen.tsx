import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type Contact = {
  id: string;
  name: string;
  phone: string;
  status: string;
};

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function IntegrationListScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pending_contacts')
      .select('id, name, phone, status')
      .eq('status', 'pending')
      .order('name');

    if (error) Alert.alert('Error', error.message);
    else setContacts(data ?? []);
    setLoading(false);
  };

  const openWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir WhatsApp')
    );
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pendientes ({contacts.length})</Text>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay contactos pendientes</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardPhone}>{item.phone}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => openWhatsApp(item.phone)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('ContactDetail', { contact: item, onDone: loadContacts })}
              >
                <Text style={styles.detailBtnText}>Gestionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22, fontWeight: '700', color: '#1E293B',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B' },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#E2E8F0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  cardPhone: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whatsappBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center', alignItems: 'center',
  },
  detailBtn: {
    backgroundColor: '#2563EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  detailBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
