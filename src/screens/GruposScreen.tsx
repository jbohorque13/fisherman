import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Grupo, TipoGrupo, Modalidad } from '../types';

const TIPO_OPTS: { value: TipoGrupo | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'chicas', label: 'Chicas' },
  { value: 'chicos', label: 'Chicos' },
  { value: 'mixto_solteros', label: 'Mixto S.' },
  { value: 'casados', label: 'Casados' },
];

const MODALIDAD_OPTS: { value: Modalidad | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
];

export default function GruposScreen() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<TipoGrupo | 'todos'>('todos');
  const [modalidad, setModalidad] = useState<Modalidad | 'todos'>('todos');

  useEffect(() => {
    loadGrupos();
  }, [tipo, modalidad]);

  const loadGrupos = async () => {
    setLoading(true);
    try {
      let query = supabase.from('grupos').select('*').order('nombre');
      if (tipo !== 'todos') query = query.eq('tipo_grupo', tipo);
      if (modalidad !== 'todos') query = query.eq('modalidad', modalidad);

      const { data, error } = await query;
      if (error) throw error;
      setGrupos(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = grupos.filter((g) =>
    g.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grupos</Text>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar grupo..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filtersRow}>
        {TIPO_OPTS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, tipo === t.value && styles.chipActive]}
            onPress={() => setTipo(t.value)}
          >
            <Text style={[styles.chipText, tipo === t.value && styles.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filtersRow, { marginTop: 4 }]}>
        {MODALIDAD_OPTS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.chip, modalidad === m.value && styles.chipActive]}
            onPress={() => setModalidad(m.value)}
          >
            <Text style={[styles.chipText, modalidad === m.value && styles.chipTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin grupos disponibles</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.modalidad}</Text>
                </View>
              </View>
              {item.descripcion ? (
                <Text style={styles.cardDesc}>{item.descripcion}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {item.tipo_grupo.replace('_', ' ')} · Edades {item.edad_min}–{item.edad_max} · Cap. {item.capacidad}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 14, color: '#1E293B' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1 },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
});
