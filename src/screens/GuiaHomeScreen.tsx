import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Linking, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

type AssignedPerson = {
  id: string; full_name: string; phone: string; status: string; created_by: string | null;
};

type StatusFilter = 'all' | 'in_process' | 'integrated' | 'not_interested' | 'error';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in_process', label: 'En proceso' },
  { value: 'integrated', label: 'Integrado' },
  { value: 'not_interested', label: 'Desinteresado' },
  { value: 'error', label: 'Error' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  in_process: '#3B82F6',
  integrated: '#10B981',
  not_interested: '#64748B',
  error: '#EF4444',
};

type Props = { navigation: NativeStackNavigationProp<any> };

export default function GuiaHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [pending, setPending] = useState<AssignedPerson[]>([]);
  const [people, setPeople] = useState<AssignedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('in_process');
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, [activeFilter]);
  useFocusEffect(useCallback(() => { loadAll(); }, [activeFilter]));

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pendingData } = await supabase
      .from('assigned_people')
      .select('id, full_name, phone, status, created_by')
      .eq('guide_id', user.id).eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPending(pendingData ?? []);

    let query = supabase
      .from('assigned_people')
      .select('id, full_name, phone, status, created_by')
      .eq('guide_id', user.id)
      .order('created_at', { ascending: false });

    if (activeFilter !== 'all') query = query.eq('status', activeFilter);
    else query = query.neq('status', 'pending');

    const { data, error } = await query;
    if (error) Alert.alert('Error', error.message);
    else setPeople(data ?? []);

    setLoading(false);
  }, [activeFilter]);

  const openWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
  };

  const filtered = people.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis personas</Text>

      {pending.length > 0 && (
        <View style={styles.pendingSection}>
          <View style={styles.pendingSectionHeader}>
            <Ionicons name="notifications" size={16} color="#D97706" />
            <Text style={styles.pendingSectionTitle}>Nuevas asignaciones ({pending.length})</Text>
          </View>
          {pending.map((p) => (
            <View key={p.id} style={styles.pendingCard}>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingName}>{p.full_name}</Text>
                <Text style={styles.pendingPhone}>{p.phone}</Text>
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity style={styles.whatsappSmall} onPress={() => openWhatsApp(p.phone)}>
                  <Ionicons name="logo-whatsapp" size={18} color={theme.whatsapp} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.reviewBtn} onPress={() => navigation.navigate('PersonDetail', { person: p, onDone: loadAll })}>
                  <Text style={styles.reviewBtnText}>Revisar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity key={tab.value} style={[styles.filterTab, activeFilter === tab.value && styles.filterTabActive]} onPress={() => setActiveFilter(tab.value)}>
            <Text style={[styles.filterTabText, activeFilter === tab.value && styles.filterTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={theme.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre..." placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.purple} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={theme.borderInput} />
              <Text style={styles.emptyText}>Sin resultados</Text>
            </View>
          }
          renderItem={({ item }) => {
            const color = STATUS_COLORS[item.status] ?? theme.textMuted;
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <View>
                    <Text style={styles.cardName}>{item.full_name}</Text>
                    <Text style={styles.cardPhone}>{item.phone}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.whatsappBtn} onPress={() => openWhatsApp(item.phone)}>
                    <Ionicons name="logo-whatsapp" size={20} color={theme.whatsapp} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('PersonDetail', { person: item, onDone: loadAll })}>
                    <Text style={styles.manageBtnText}>Gestionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '700', color: theme.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    pendingSection: {
      marginHorizontal: 16, marginBottom: 12,
      backgroundColor: theme.warningSurface, borderRadius: 12,
      borderWidth: 1, borderColor: theme.warningBorder, padding: 12,
    },
    pendingSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    pendingSectionTitle: { fontSize: 14, fontWeight: '700', color: theme.warningText },
    pendingCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.surface, borderRadius: 10, padding: 10,
      borderWidth: 1, borderColor: theme.warningBorder, marginBottom: 8,
    },
    pendingInfo: { flex: 1 },
    pendingName: { fontSize: 14, fontWeight: '600', color: theme.text },
    pendingPhone: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
    pendingActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    whatsappSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.successSurface, justifyContent: 'center', alignItems: 'center' },
    reviewBtn: { backgroundColor: theme.warning, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    reviewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    filtersScroll: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: theme.border },
    filtersContent: { paddingHorizontal: 16, gap: 4 },
    filterTab: { paddingHorizontal: 14, paddingVertical: 10 },
    filterTabActive: { borderBottomWidth: 2, borderBottomColor: theme.purple },
    filterTabText: { fontSize: 13, color: theme.textSecondary },
    filterTabTextActive: { color: theme.purple, fontWeight: '700' },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginVertical: 10,
      backgroundColor: theme.surface, borderRadius: 8,
      borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 12, height: 40,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.text },
    list: { padding: 16, gap: 10, paddingBottom: 32 },
    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyText: { color: theme.textMuted, fontSize: 15 },
    card: {
      backgroundColor: theme.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    cardName: { fontSize: 15, fontWeight: '600', color: theme.text },
    cardPhone: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    whatsappBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.successSurface, justifyContent: 'center', alignItems: 'center' },
    manageBtn: { backgroundColor: theme.purple, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    manageBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  });
}
