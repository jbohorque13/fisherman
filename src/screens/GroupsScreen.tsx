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
import { supabase } from '../lib/supabase';
import { Grupo, Profile } from '../types';

const TIPO_LABEL: Record<string, string> = {
  chicas: 'Chicas',
  chicos: 'Chicos',
  mixto_solteros: 'Mixto Solteros',
  casados: 'Casados',
};

export default function GroupsScreen() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [asignado, setAsignado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Verificar si ya tiene asignación
      const { data: asignacionData } = await supabase
        .from('asignaciones')
        .select('grupo_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (asignacionData) {
        setAsignado(asignacionData.grupo_id);
      }

      // Cargar grupos filtrados
      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos')
        .select('*')
        .eq('tipo_grupo', profileData.tipo_grupo)
        .eq('modalidad', profileData.modalidad)
        .lte('edad_min', profileData.edad)
        .gte('edad_max', profileData.edad);

      if (gruposError) throw gruposError;
      setGrupos(gruposData ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudieron cargar los grupos');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarGrupo = async (grupoId: string) => {
    if (asignado) {
      Alert.alert('Ya estás asignado', 'Ya tienes un grupo asignado.');
      return;
    }

    Alert.alert('Confirmar', '¿Unirte a este grupo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setSelecting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('asignaciones').insert({
              user_id: user.id,
              grupo_id: grupoId,
            });

            if (error) throw error;
            setAsignado(grupoId);
            Alert.alert('¡Listo!', 'Fuiste asignado al grupo exitosamente.');
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'No se pudo guardar la asignación');
          } finally {
            setSelecting(false);
          }
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
      <Text style={styles.title}>Grupos disponibles</Text>
      {profile && (
        <Text style={styles.subtitle}>
          {TIPO_LABEL[profile.tipo_grupo]} · {profile.modalidad} · {profile.edad} años
        </Text>
      )}

      {asignado && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Ya tienes un grupo asignado</Text>
        </View>
      )}

      {grupos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>No hay grupos disponibles para tu perfil.</Text>
        </View>
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isSelected = asignado === item.id;
            return (
              <View style={[styles.card, isSelected && styles.cardSelected]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.nombre}</Text>
                  {isSelected && <Text style={styles.badge}>Tu grupo</Text>}
                </View>
                {item.descripcion && (
                  <Text style={styles.cardDesc}>{item.descripcion}</Text>
                )}
                <Text style={styles.cardMeta}>
                  Edades {item.edad_min}–{item.edad_max} · {TIPO_LABEL[item.tipo_grupo]} · {item.modalidad}
                </Text>
                {!asignado && (
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => seleccionarGrupo(item.id)}
                    disabled={selecting}
                  >
                    <Text style={styles.selectButtonText}>Unirme</Text>
                  </TouchableOpacity>
                )}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', padding: 24, paddingBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B', paddingHorizontal: 24, marginBottom: 12 },
  banner: {
    backgroundColor: '#DCFCE7',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  bannerText: { color: '#166534', fontWeight: '600', textAlign: 'center' },
  list: { padding: 24, paddingTop: 0, gap: 12 },
  empty: { color: '#94A3B8', fontSize: 16, textAlign: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSelected: { borderColor: '#2563EB', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  badge: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardDesc: { fontSize: 14, color: '#64748B', marginTop: 4 },
  cardMeta: { fontSize: 13, color: '#94A3B8', marginTop: 8 },
  selectButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: { color: '#fff', fontWeight: '600' },
});
