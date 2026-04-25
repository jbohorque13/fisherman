import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'sin_integrador' | 'sin_guia' | 'con_guia';

type PersonaRow = {
  id: string;
  name: string;
  phone: string;
  edad: number | null;
  genero: string | null;
  tipo_grupo: string | null;
  modalidad: string | null;
  integrador_nombre: string | null;
  grupo_nombre: string | null;
  source: 'pending' | 'in_process' | 'integrated';
};

type ProfileMap = Record<string, string>;
type GrupoMap   = Record<string, string>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPeopleTab() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [filter, setFilter]             = useState<Filter>('sin_integrador');
  const [sinIntegrador, setSinIntegrador] = useState<PersonaRow[]>([]);
  const [sinGuia, setSinGuia]           = useState<PersonaRow[]>([]);
  const [conGuia, setConGuia]           = useState<PersonaRow[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      // 1. pending_contacts pendientes
      const { data: pcs, error: e1 } = await supabase
        .from('pending_contacts')
        .select('id, name, phone, integrador_id, persona:personas(edad, genero, tipo_grupo, modalidad)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (e1) throw e1;

      // 2. assigned_people en proceso (con integrador, sin guía)
      const { data: inProcess, error: e2 } = await supabase
        .from('assigned_people')
        .select('id, full_name, phone, created_by')
        .eq('status', 'in_process')
        .order('created_at', { ascending: false });
      if (e2) throw e2;

      // 3. assigned_people integrados (con guía)
      const { data: integrated, error: e3 } = await supabase
        .from('assigned_people')
        .select('id, full_name, phone, created_by, grupo_id')
        .eq('status', 'integrated')
        .order('created_at', { ascending: false });
      if (e3) throw e3;

      // 4. Perfiles de integradores
      const integradorIds = [
        ...new Set([
          ...(pcs       ?? []).map((c: any) => c.integrador_id).filter(Boolean),
          ...(inProcess ?? []).map((a: any) => a.created_by).filter(Boolean),
          ...(integrated ?? []).map((a: any) => a.created_by).filter(Boolean),
        ]),
      ];
      const profileMap: ProfileMap = {};
      if (integradorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre, apellido')
          .in('id', integradorIds);
        (profiles ?? []).forEach((p: any) => {
          profileMap[p.id] = `${p.nombre} ${p.apellido}`;
        });
      }

      // 5. Nombres de grupos para los integrados
      const grupoIds = [...new Set((integrated ?? []).map((a: any) => a.grupo_id).filter(Boolean))];
      const grupoMap: GrupoMap = {};
      if (grupoIds.length > 0) {
        const { data: grupos } = await supabase
          .from('grupos')
          .select('id, nombre')
          .in('id', grupoIds);
        (grupos ?? []).forEach((g: any) => { grupoMap[g.id] = g.nombre; });
      }

      // 6. Construir listas
      const noIntegrador: PersonaRow[] = [];
      const noGuia:        PersonaRow[] = [];
      const yesGuia:       PersonaRow[] = [];

      for (const c of (pcs ?? [])) {
        const persona = Array.isArray(c.persona) ? c.persona[0] : c.persona;
        const row: PersonaRow = {
          id:   c.id,
          name: c.name,
          phone: c.phone,
          edad:      persona?.edad      ?? null,
          genero:    persona?.genero    ?? null,
          tipo_grupo: persona?.tipo_grupo ?? null,
          modalidad:  persona?.modalidad  ?? null,
          integrador_nombre: c.integrador_id ? (profileMap[c.integrador_id] ?? 'Integrador') : null,
          grupo_nombre: null,
          source: 'pending',
        };
        if (!c.integrador_id) noIntegrador.push(row);
        else noGuia.push(row);
      }

      for (const a of (inProcess ?? [])) {
        noGuia.push({
          id: a.id, name: a.full_name, phone: a.phone ?? '',
          edad: null, genero: null, tipo_grupo: null, modalidad: null,
          integrador_nombre: a.created_by ? (profileMap[a.created_by] ?? 'Integrador') : null,
          grupo_nombre: null,
          source: 'in_process',
        });
      }

      for (const a of (integrated ?? [])) {
        yesGuia.push({
          id: a.id, name: a.full_name, phone: a.phone ?? '',
          edad: null, genero: null, tipo_grupo: null, modalidad: null,
          integrador_nombre: a.created_by ? (profileMap[a.created_by] ?? 'Integrador') : null,
          grupo_nombre: a.grupo_id ? (grupoMap[a.grupo_id] ?? null) : null,
          source: 'integrated',
        });
      }

      setSinIntegrador(noIntegrador);
      setSinGuia(noGuia);
      setConGuia(yesGuia);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentData =
    filter === 'sin_integrador' ? sinIntegrador :
    filter === 'sin_guia'       ? sinGuia       : conGuia;

  const SOURCE_BADGE: Record<PersonaRow['source'], { label: string; bg: string; color: string }> = {
    pending:    { label: 'pendiente',   bg: theme.surfaceAlt,    color: theme.textMuted },
    in_process: { label: 'en proceso',  bg: theme.warningSurface, color: theme.warning },
    integrated: { label: 'integrado',   bg: theme.successSurface, color: theme.success },
  };

  const renderItem = ({ item }: { item: PersonaRow }) => {
    const badge = SOURCE_BADGE[item.source];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.sourceBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.sourceBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {!!item.phone && <Text style={styles.cardPhone}>{item.phone}</Text>}

        {(item.edad != null || item.genero || item.tipo_grupo || item.modalidad) && (
          <View style={styles.tags}>
            {item.edad != null && <View style={styles.tag}><Text style={styles.tagText}>{item.edad} años</Text></View>}
            {item.genero     && <View style={styles.tag}><Text style={styles.tagText}>{item.genero}</Text></View>}
            {item.tipo_grupo && <View style={styles.tag}><Text style={styles.tagText}>{item.tipo_grupo}</Text></View>}
            {item.modalidad  && <View style={styles.tag}><Text style={styles.tagText}>{item.modalidad}</Text></View>}
          </View>
        )}

        <View style={styles.metaRow}>
          {item.integrador_nombre && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color={theme.primary} />
              <Text style={[styles.metaText, { color: theme.primary }]}>{item.integrador_nombre}</Text>
            </View>
          )}
          {item.grupo_nombre && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={theme.success} />
              <Text style={[styles.metaText, { color: theme.success }]}>{item.grupo_nombre}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'sin_integrador', label: 'Sin integrador', count: sinIntegrador.length },
    { key: 'sin_guia',       label: 'Sin guía',       count: sinGuia.length },
    { key: 'con_guia',       label: 'Con guía',       count: conGuia.length },
  ];

  return (
    <View style={styles.container}>
      {/* Filtro segmentado */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
            {f.count > 0 && (
              <View style={[
                styles.countBadge,
                filter === f.key ? styles.countBadgeActive : styles.countBadgeInactive,
              ]}>
                <Text style={[
                  styles.countText,
                  filter === f.key ? styles.countTextActive : styles.countTextInactive,
                ]}>
                  {f.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={filter === 'con_guia' ? 'people-outline' : 'checkmark-circle-outline'}
                size={48}
                color={filter === 'con_guia' ? theme.textMuted : theme.success}
              />
              <Text style={styles.emptyText}>
                {filter === 'sin_integrador' ? 'Todos tienen integrador asignado' :
                 filter === 'sin_guia'       ? 'Todos están integrados a un grupo' :
                                              'Ninguna persona integrada aún'}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

    filterRow: {
      flexDirection: 'row', gap: 6,
      marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    },
    filterBtn: {
      flex: 1, alignItems: 'center', gap: 4,
      paddingVertical: 8, borderRadius: 10,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1, borderColor: 'transparent',
    },
    filterBtnActive: {
      backgroundColor: theme.surface,
      borderColor: theme.primary,
    },
    filterText: { fontSize: 11, fontWeight: '500', color: theme.textMuted, textAlign: 'center' },
    filterTextActive: { color: theme.primary, fontWeight: '700' },

    countBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
    countBadgeActive:   { backgroundColor: theme.primary },
    countBadgeInactive: { backgroundColor: theme.border },
    countText: { fontSize: 11, fontWeight: '700' },
    countTextActive:   { color: '#fff' },
    countTextInactive: { color: theme.textSecondary },

    list: { padding: 16, gap: 10 },
    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 32 },

    card: {
      backgroundColor: theme.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border, gap: 5,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardName:   { fontSize: 15, fontWeight: '600', color: theme.text, flex: 1 },
    cardPhone:  { fontSize: 13, color: theme.textSecondary },

    sourceBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    sourceBadgeText: { fontSize: 11, fontWeight: '600' },

    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    tag: { backgroundColor: theme.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tagText: { fontSize: 12, color: theme.textSecondary },

    metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, fontWeight: '500' },
  });
}
