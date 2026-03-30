import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Persona, PersonaStatus, Genero } from '../types';

const STATUS_TABS: { value: PersonaStatus; label: string }[] = [
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'integrado', label: 'Integrado' },
  { value: 'desinteresado', label: 'Desinteresado' },
  { value: 'error', label: 'Error' },
];

const STATUS_COLORS: Record<PersonaStatus, string> = {
  en_proceso: '#F59E0B',
  integrado: '#10B981',
  desinteresado: '#64748B',
  error: '#EF4444',
};

const GENERO_OPTS: { value: Genero | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
];

export default function IntegrarScreen() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PersonaStatus>('en_proceso');
  const [genero, setGenero] = useState<Genero | 'todos'>('todos');
  const [edadMin, setEdadMin] = useState('');
  const [edadMax, setEdadMax] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPersonas();
  }, [status, genero, edadMin, edadMax]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('personas')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (genero !== 'todos') query = query.eq('genero', genero);
      if (edadMin) query = query.gte('edad', parseInt(edadMin));
      if (edadMax) query = query.lte('edad', parseInt(edadMax));

      const { data, error } = await query;
      if (error) throw error;
      setPersonas(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = personas.filter((p) =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Integrar</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusRow}
        contentContainerStyle={styles.statusRowContent}
      >
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.statusTab, status === tab.value && { borderBottomColor: STATUS_COLORS[tab.value], borderBottomWidth: 2 }]}
            onPress={() => setStatus(tab.value)}
          >
            <Text style={[styles.statusTabText, status === tab.value && { color: STATUS_COLORS[tab.value], fontWeight: '700' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filtersRow}>
        {GENERO_OPTS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[styles.chip, genero === g.value && styles.chipActive]}
            onPress={() => setGenero(g.value)}
          >
            <Text style={[styles.chipText, genero === g.value && styles.chipTextActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.edadInput}
          placeholder="Min"
          placeholderTextColor="#94A3B8"
          value={edadMin}
          onChangeText={setEdadMin}
          keyboardType="numeric"
        />
        <Text style={styles.edadSep}>–</Text>
        <TextInput
          style={styles.edadInput}
          placeholder="Max"
          placeholderTextColor="#94A3B8"
          value={edadMax}
          onChangeText={setEdadMax}
          keyboardType="numeric"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
          renderItem={({ item }) => {
            const color = STATUS_COLORS[item.status];
            const label = STATUS_TABS.find((s) => s.value === item.status)?.label;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>
                    {item.nombre} {item.apellido}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.badgeText, { color }]}>{label}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {item.edad} años · {item.genero} · {item.tipo_grupo.replace('_', ' ')} · {item.modalidad}
                </Text>
                {item.celular ? <Text style={styles.cardContact}>{item.celular}</Text> : null}
                {item.email ? <Text style={styles.cardContact}>{item.email}</Text> : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  statusRow: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', maxHeight: 44 },
  statusRowContent: { paddingHorizontal: 16, gap: 4 },
  statusTab: { paddingHorizontal: 12, paddingVertical: 10 },
  statusTabText: { fontSize: 13, color: '#64748B' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 14, color: '#1E293B' },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  edadInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 56,
    fontSize: 13,
    color: '#1E293B',
    textAlign: 'center',
  },
  edadSep: { color: '#94A3B8', fontSize: 14 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  cardContact: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});
