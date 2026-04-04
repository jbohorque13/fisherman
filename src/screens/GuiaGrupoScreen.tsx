import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, FlatList,
  RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { TipoGrupo, Modalidad } from '../types';
import SwipeablePersonRow from '../components/SwipeablePersonRow';

type Grupo = {
  id: string; nombre: string; tipo_grupo: TipoGrupo; modalidad: Modalidad;
  edad_min: number; edad_max: number; capacidad: number; descripcion: string | null;
};
type GrupoPerson = { id: string; full_name: string; phone: string; status: string };

const TIPOS: { value: TipoGrupo; label: string }[] = [
  { value: 'chicas', label: 'Chicas' }, { value: 'chicos', label: 'Chicos' },
  { value: 'mixto_solteros', label: 'Mixto Solteros' }, { value: 'casados', label: 'Casados' },
];
const MODALIDADES: { value: Modalidad; label: string }[] = [
  { value: 'online', label: 'Online' }, { value: 'presencial', label: 'Presencial' },
];

export default function GuiaGrupoScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [people, setPeople] = useState<GrupoPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [edadMin, setEdadMin] = useState('');
  const [edadMax, setEdadMax] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [tipoGrupo, setTipoGrupo] = useState<TipoGrupo>('chicas');
  const [modalidad, setModalidad] = useState<Modalidad>('presencial');

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(false); setRefreshing(false); };

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: grupoData, error } = await supabase.from('grupos').select('*').eq('guide_id', user.id).maybeSingle();
    if (error) Alert.alert('Error', error.message);
    if (grupoData) {
      setGrupo(grupoData);
      setNombre(grupoData.nombre);
      setDescripcion(grupoData.descripcion ?? '');
      setEdadMin(String(grupoData.edad_min));
      setEdadMax(String(grupoData.edad_max));
      setCapacidad(String(grupoData.capacidad));
      setTipoGrupo(grupoData.tipo_grupo);
      setModalidad(grupoData.modalidad);
    }

    const { data: peopleData } = await supabase
      .from('assigned_people')
      .select('id, full_name, phone, status, guide_id')
      .eq('guide_id', user.id)
      .in('status', ['pending', 'integrated'])
      .order('full_name');

    setPeople(peopleData ?? []);
    if (showLoader) setLoading(false);
  };

  const deletePerson = async (id: string) => {
    const { error } = await supabase.from('assigned_people').delete().eq('id', id);
    if (error) return Alert.alert('Error', error.message);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const addPersonToGroup = async () => {
    if (!addName.trim()) return Alert.alert('Requerido', 'El nombre es obligatorio');
    if (!addPhone.trim()) return Alert.alert('Requerido', 'El teléfono es obligatorio');
    setAddingPerson(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddingPerson(false); return; }
    const { error } = await supabase.from('assigned_people').insert({
      full_name: addName.trim(), phone: addPhone.trim(), status: 'integrated',
      guide_id: user.id, grupo_id: grupo?.id ?? null, created_by: user.id,
    });
    setAddingPerson(false);
    if (error) return Alert.alert('Error', error.message);
    setShowAddModal(false); setAddName(''); setAddPhone('');
    await loadData(false);
  };

  const saveGrupo = async () => {
    if (!nombre.trim()) return Alert.alert('Requerido', 'El nombre es obligatorio');
    if (!edadMin || !edadMax) return Alert.alert('Requerido', 'Ingresa el rango de edad');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      nombre: nombre.trim(), descripcion: descripcion.trim() || null,
      edad_min: parseInt(edadMin) || 0, edad_max: parseInt(edadMax) || 99,
      capacidad: parseInt(capacidad) || 10, tipo_grupo: tipoGrupo, modalidad, guide_id: user.id,
    };
    let error;
    if (grupo) ({ error } = await supabase.from('grupos').update(payload).eq('id', grupo.id));
    else ({ error } = await supabase.from('grupos').insert(payload));
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Guardado', grupo ? 'Grupo actualizado' : 'Grupo creado');
    setEditing(false); loadData();
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.purple} /></View>;
  }

  if (!grupo && !editing) {
    return (
      <View style={styles.centered}>
        <Ionicons name="people-circle-outline" size={56} color={theme.purple} />
        <Text style={styles.noGroupText}>Aún no tienes un grupo</Text>
        <Text style={styles.noGroupSub}>Crea tu grupo de conexión</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setEditing(true)}>
          <Text style={styles.createBtnText}>Crear grupo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.purple]} tintColor={theme.purple} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{grupo ? 'Mi Grupo' : 'Crear grupo'}</Text>
        <View style={styles.headerActions}>
          {grupo && (
            <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.headerBtn}>
              <Ionicons name={editing ? 'close-circle-outline' : 'create-outline'} size={24} color={theme.purple} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!editing ? (
        <View style={styles.infoCard}>
          <Text style={styles.groupName}>{grupo!.nombre}</Text>
          {grupo!.descripcion ? <Text style={styles.groupDesc}>{grupo!.descripcion}</Text> : null}
          <View style={styles.badges}>
            <View style={styles.badge}><Text style={styles.badgeText}>{grupo!.tipo_grupo.replace('_', ' ')}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{grupo!.modalidad}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{grupo!.edad_min}–{grupo!.edad_max} años</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Cap. {grupo!.capacidad}</Text></View>
          </View>
        </View>
      ) : (
        <View style={styles.editCard}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={theme.textMuted} />

          <Text style={styles.label}>Descripción</Text>
          <TextInput style={[styles.input, styles.textArea]} value={descripcion} onChangeText={setDescripcion} multiline numberOfLines={3} placeholderTextColor={theme.textMuted} />

          <Text style={styles.label}>Tipo de grupo</Text>
          <View style={styles.chips}>
            {TIPOS.map((t) => (
              <TouchableOpacity key={t.value} style={[styles.chip, tipoGrupo === t.value && styles.chipActive]} onPress={() => setTipoGrupo(t.value)}>
                <Text style={[styles.chipText, tipoGrupo === t.value && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Modalidad</Text>
          <View style={styles.chips}>
            {MODALIDADES.map((m) => (
              <TouchableOpacity key={m.value} style={[styles.chip, modalidad === m.value && styles.chipActive]} onPress={() => setModalidad(m.value)}>
                <Text style={[styles.chipText, modalidad === m.value && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Edad mín.</Text>
              <TextInput style={styles.input} value={edadMin} onChangeText={setEdadMin} keyboardType="numeric" placeholderTextColor={theme.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Edad máx.</Text>
              <TextInput style={styles.input} value={edadMax} onChangeText={setEdadMax} keyboardType="numeric" placeholderTextColor={theme.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Capacidad</Text>
              <TextInput style={styles.input} value={capacidad} onChangeText={setCapacidad} keyboardType="numeric" placeholderTextColor={theme.textMuted} />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveGrupo} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Personas ({people.length})</Text>
        <TouchableOpacity style={styles.addPersonBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="person-add-outline" size={16} color={theme.purple} />
          <Text style={styles.addPersonBtnText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {people.length === 0 ? (
        <View style={styles.emptyPeople}>
          <Text style={styles.emptyText}>Aún no hay personas integradas</Text>
        </View>
      ) : (
        people.map((p) => <SwipeablePersonRow key={p.id} person={p} onDelete={deletePerson} />)
      )}
    </ScrollView>

    <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar persona</Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); setAddName(''); setAddPhone(''); }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Nombre completo *</Text>
          <TextInput style={styles.input} value={addName} onChangeText={setAddName} placeholder="Juan Pérez" placeholderTextColor={theme.textMuted} />
          <Text style={styles.label}>Teléfono *</Text>
          <TextInput style={styles.input} value={addPhone} onChangeText={setAddPhone} placeholder="+57 300 000 0000" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.saveBtn} onPress={addPersonToGroup} disabled={addingPerson}>
            {addingPerson ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Agregar al grupo</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 32 },
    content: { padding: 20, paddingBottom: 48 },
    noGroupText: { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: 'center' },
    noGroupSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
    createBtn: { marginTop: 16, backgroundColor: theme.purple, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
    createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text },
    infoCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 28 },
    groupName: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 6 },
    groupDesc: { fontSize: 14, color: theme.textSecondary, marginBottom: 12 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { backgroundColor: theme.purpleSurface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 12, color: theme.purple, fontWeight: '600' },
    editCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 28 },
    label: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 5, marginTop: 12 },
    input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 11, fontSize: 14, color: theme.text, backgroundColor: theme.surface },
    textArea: { minHeight: 70, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    chipActive: { backgroundColor: theme.purple, borderColor: theme.purple },
    chipText: { fontSize: 13, color: theme.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 10 },
    saveBtn: { backgroundColor: theme.purple, borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBtn: { padding: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    addPersonBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.purpleSurface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    addPersonBtnText: { fontSize: 13, fontWeight: '600', color: theme.purple },
    modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
    modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    emptyPeople: { alignItems: 'center', padding: 20 },
    emptyText: { color: theme.textMuted, fontSize: 14 },
  });
}
