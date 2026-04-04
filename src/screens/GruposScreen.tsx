import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { TipoGrupo, Modalidad } from '../types';

type GrupoWithGuia = {
  id: string; nombre: string; tipo_grupo: TipoGrupo; modalidad: Modalidad;
  edad_min: number; edad_max: number; capacidad: number; descripcion: string | null;
  guide_id: string; guia_name: string | null; guia_avatar: string | null;
};

const TIPO_OPTS: { value: TipoGrupo | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' }, { value: 'chicas', label: 'Chicas' },
  { value: 'chicos', label: 'Chicos' }, { value: 'mixto_solteros', label: 'Mixto S.' },
  { value: 'casados', label: 'Casados' },
];
const MODALIDAD_OPTS: { value: Modalidad | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' }, { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
];

export default function GruposScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [grupos, setGrupos] = useState<GrupoWithGuia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<TipoGrupo | 'todos'>('todos');
  const [modalidad, setModalidad] = useState<Modalidad | 'todos'>('todos');
  const [edadMin, setEdadMin] = useState('');
  const [edadMax, setEdadMax] = useState('');

  useEffect(() => { loadGrupos(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadGrupos(false); setRefreshing(false); };

  const loadGrupos = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [gruposRes, profilesRes] = await Promise.all([
        supabase.from('grupos')
          .select('id, nombre, tipo_grupo, modalidad, edad_min, edad_max, capacidad, descripcion, guide_id')
          .not('guide_id', 'is', null).order('nombre'),
        supabase.from('profiles').select('id, full_name, avatar_url').eq('role', 'guia'),
      ]);
      if (gruposRes.error) throw gruposRes.error;
      if (profilesRes.error) throw profilesRes.error;
      const guiaMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      setGrupos((gruposRes.data ?? []).map((g: any) => {
        const guia = guiaMap.get(g.guide_id);
        return { ...g, guia_name: guia?.full_name ?? null, guia_avatar: guia?.avatar_url ?? null };
      }));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const filtered = grupos.filter((g) => {
    if (!g.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (tipo !== 'todos' && g.tipo_grupo !== tipo) return false;
    if (modalidad !== 'todos' && g.modalidad !== modalidad) return false;
    const min = edadMin ? parseInt(edadMin) : null;
    const max = edadMax ? parseInt(edadMax) : null;
    if (min !== null && g.edad_max < min) return false;
    if (max !== null && g.edad_min > max) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grupos ({filtered.length})</Text>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar grupo..."
          placeholderTextColor={theme.textMuted}
          value={search} onChangeText={setSearch}
        />
      </View>

      <View style={styles.filtersRow}>
        {TIPO_OPTS.map((t) => (
          <TouchableOpacity key={t.value} style={[styles.chip, tipo === t.value && styles.chipActive]} onPress={() => setTipo(t.value)}>
            <Text style={[styles.chipText, tipo === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filtersRow, { marginTop: 6 }]}>
        {MODALIDAD_OPTS.map((m) => (
          <TouchableOpacity key={m.value} style={[styles.chip, modalidad === m.value && styles.chipActive]} onPress={() => setModalidad(m.value)}>
            <Text style={[styles.chipText, modalidad === m.value && styles.chipTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.edadRow}>
        <Ionicons name="people-outline" size={15} color={theme.textMuted} />
        <Text style={styles.edadLabel}>Edad:</Text>
        <TextInput style={styles.edadInput} placeholder="Min" placeholderTextColor={theme.textMuted} value={edadMin} onChangeText={setEdadMin} keyboardType="numeric" maxLength={3} />
        <Text style={styles.edadSep}>–</Text>
        <TextInput style={styles.edadInput} placeholder="Max" placeholderTextColor={theme.textMuted} value={edadMax} onChangeText={setEdadMax} keyboardType="numeric" maxLength={3} />
        {(edadMin || edadMax) ? (
          <TouchableOpacity onPress={() => { setEdadMin(''); setEdadMax(''); }}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="grid-outline" size={40} color={theme.borderInput} />
              <Text style={styles.empty}>Sin grupos disponibles</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{item.modalidad}</Text></View>
              </View>
              {item.descripcion ? <Text style={styles.cardDesc}>{item.descripcion}</Text> : null}
              <View style={styles.metaRow}>
                <View style={styles.metaBadge}><Text style={styles.metaBadgeText}>{item.tipo_grupo.replace('_', ' ')}</Text></View>
                <View style={styles.metaBadge}><Text style={styles.metaBadgeText}>{item.edad_min}–{item.edad_max} años</Text></View>
                <View style={styles.metaBadge}><Text style={styles.metaBadgeText}>Cap. {item.capacidad}</Text></View>
              </View>
              <View style={styles.guiaDivider} />
              <View style={styles.guiaRow}>
                {item.guia_avatar ? (
                  <Image source={{ uri: item.guia_avatar }} style={styles.guiaAvatar} />
                ) : (
                  <View style={[styles.guiaAvatar, styles.guiaAvatarPlaceholder]}>
                    <Ionicons name="person" size={13} color={theme.purple} />
                  </View>
                )}
                <Text style={styles.guiaName}>{item.guia_name ?? 'Guía sin nombre'}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    title: { fontSize: 22, fontWeight: '700', color: theme.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10,
      backgroundColor: theme.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 40, fontSize: 14, color: theme.text },
    filtersRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
    chip: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 13, color: theme.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    edadRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginTop: 10, marginBottom: 2 },
    edadLabel: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
    edadInput: {
      borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4, width: 54, fontSize: 13,
      color: theme.text, textAlign: 'center', backgroundColor: theme.surface,
    },
    edadSep: { color: theme.textMuted, fontSize: 14 },
    loader: { marginTop: 40 },
    list: { padding: 16, gap: 10, paddingBottom: 32 },
    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
    empty: { textAlign: 'center', color: theme.textMuted, fontSize: 15 },
    card: { backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1 },
    badge: { backgroundColor: theme.primarySurface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '600', color: theme.primary },
    cardDesc: { fontSize: 13, color: theme.textSecondary, marginBottom: 8 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    metaBadge: { backgroundColor: theme.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    metaBadgeText: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
    guiaDivider: { height: 1, backgroundColor: theme.surfaceAlt, marginVertical: 10 },
    guiaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    guiaAvatar: { width: 26, height: 26, borderRadius: 13 },
    guiaAvatarPlaceholder: { backgroundColor: theme.purpleSurface, justifyContent: 'center', alignItems: 'center' },
    guiaName: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  });
}
