import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

type PersonaData = { edad: number; genero: string; tipo_grupo: string; modalidad: string };
type Contact = { id: string; name: string; phone: string; status: string; persona: PersonaData | null; isRejected?: boolean };
type Tab = 'pending' | 'rejected';
type Props = { navigation: NativeStackNavigationProp<any> };

export default function IntegrationListScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [tab, setTab] = useState<Tab>('pending');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [rejected, setRejected] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { loadAll(true); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadAll(false); setRefreshing(false); };

  const loadAll = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_contacts')
      .select('id, name, phone, status, persona:personas(edad, genero, tipo_grupo, modalidad)')
      .eq('status', 'pending').order('name');

    if (pendingError) Alert.alert('Error', pendingError.message);
    else {
      setContacts((pendingData ?? []).map((c: any) => ({
        id: c.id, name: c.name, phone: c.phone, status: c.status,
        persona: Array.isArray(c.persona) ? (c.persona[0] ?? null) : (c.persona ?? null),
      })));
    }

    const { data: rejectedData, error: rejectedError } = await supabase
      .from('assigned_people')
      .select('id, full_name, phone, status, created_by')
      .eq('status', 'rejected').eq('created_by', user.id).order('full_name');

    if (rejectedError) Alert.alert('Error', rejectedError.message);
    else {
      setRejected((rejectedData ?? []).map((r: any) => ({
        id: r.id, name: r.full_name, phone: r.phone, status: r.status, persona: null, isRejected: true,
      })));
    }

    if (showLoader) setLoading(false);
  };

  const openWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
  };

  const list = tab === 'pending' ? contacts : rejected;
  const filtered = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Integrar</Text>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'pending' && styles.tabActive]} onPress={() => setTab('pending')}>
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Pendientes{contacts.length > 0 && <Text style={styles.tabBadge}> {contacts.length}</Text>}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'rejected' && styles.tabActive]} onPress={() => setTab('rejected')}>
          <Text style={[styles.tabText, tab === 'rejected' && styles.tabTextActive]}>
            Rechazados{rejected.length > 0 && <Text style={styles.tabBadgeRed}> {rejected.length}</Text>}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={theme.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre..." placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={tab === 'pending' ? 'checkmark-circle-outline' : 'checkmark-done-outline'} size={48} color={theme.borderInput} />
            <Text style={styles.empty}>{tab === 'pending' ? 'No hay contactos pendientes' : 'No hay rechazados'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.isRejected && styles.cardRejected]}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardPhone}>{item.phone}</Text>
              {item.isRejected && (
                <View style={styles.rejectedBadge}>
                  <Ionicons name="close-circle" size={12} color={theme.danger} />
                  <Text style={styles.rejectedBadgeText}>Rechazado por guía</Text>
                </View>
              )}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.whatsappBtn} onPress={() => openWhatsApp(item.phone)}>
                <Ionicons name="logo-whatsapp" size={20} color={theme.whatsapp} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailBtn, item.isRejected && styles.detailBtnRejected]}
                onPress={() => navigation.navigate('ContactDetail', { contact: item, onDone: () => loadAll(false) })}
              >
                <Text style={styles.detailBtnText}>{item.isRejected ? 'Reasignar' : 'Gestionar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '700', color: theme.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border, marginHorizontal: 16 },
    tab: { paddingVertical: 10, paddingHorizontal: 12, marginBottom: -1 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabText: { fontSize: 14, fontWeight: '500', color: theme.textMuted },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    tabBadge: { color: theme.warning, fontWeight: '700' },
    tabBadgeRed: { color: theme.danger, fontWeight: '700' },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginTop: 12, marginBottom: 4,
      backgroundColor: theme.surface, borderRadius: 8,
      borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 12, height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.text },
    list: { padding: 16, gap: 10 },
    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
    empty: { textAlign: 'center', color: theme.textMuted, fontSize: 14 },
    card: {
      backgroundColor: theme.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cardRejected: { borderColor: theme.dangerBorder, backgroundColor: theme.dangerSurface },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: '600', color: theme.text },
    cardPhone: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    rejectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    rejectedBadgeText: { fontSize: 11, color: theme.danger, fontWeight: '600' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    whatsappBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.successSurface, justifyContent: 'center', alignItems: 'center' },
    detailBtn: { backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    detailBtnRejected: { backgroundColor: theme.danger },
    detailBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  });
}
