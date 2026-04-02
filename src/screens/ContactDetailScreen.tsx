import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Linking, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type Group = { id: string; name: string };

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function ContactDetailScreen({ navigation, route }: Props) {
  const { contact, onDone } = route.params as any;

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [mode, setMode] = useState<'idle' | 'assign' | 'exception'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('groups')
      .select('id, name')
      .order('name')
      .then(({ data }) => setGroups(data ?? []));
  }, []);

  const openWhatsApp = () => {
    const clean = contact.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir WhatsApp')
    );
  };

  const assignToGroup = async () => {
    if (!selectedGroup) {
      Alert.alert('Selecciona un grupo');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('pending_contacts')
      .update({ status: 'assigned', group_id: selectedGroup })
      .eq('id', contact.id);

    setLoading(false);
    if (error) return Alert.alert('Error', error.message);

    Alert.alert('¡Listo!', 'Persona asignada al grupo', [
      { text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } },
    ]);
  };

  const moveToException = async () => {
    if (!exceptionReason.trim()) {
      Alert.alert('Escribe el motivo');
      return;
    }
    setLoading(true);
    const [updateRes, insertRes] = await Promise.all([
      supabase
        .from('pending_contacts')
        .update({ status: 'exception' })
        .eq('id', contact.id),
      supabase
        .from('exceptions')
        .insert({ contact_id: contact.id, reason: exceptionReason.trim() }),
    ]);

    setLoading(false);
    const error = updateRes.error ?? insertRes.error;
    if (error) return Alert.alert('Error', error.message);

    Alert.alert('Guardado', 'Movido a excepciones', [
      { text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#1E293B" />
      </TouchableOpacity>

      <Text style={styles.name}>{contact.name}</Text>
      <Text style={styles.phone}>{contact.phone}</Text>

      <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        <Text style={styles.whatsappBtnText}>Contactar por WhatsApp</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Acciones */}
      {mode === 'idle' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setMode('assign')}
          >
            <Ionicons name="people" size={20} color="#2563EB" />
            <Text style={styles.actionBtnText}>Asignar a un grupo</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => setMode('exception')}
          >
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
              Mover a excepciones
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Asignar grupo */}
      {mode === 'assign' && (
        <View>
          <Text style={styles.sectionTitle}>Selecciona un grupo</Text>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupItem, selectedGroup === g.id && styles.groupItemSelected]}
              onPress={() => setSelectedGroup(g.id)}
            >
              <Text style={[styles.groupName, selectedGroup === g.id && { color: '#2563EB' }]}>
                {g.name}
              </Text>
              {selectedGroup === g.id && (
                <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('idle')}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={assignToGroup} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Excepción */}
      {mode === 'exception' && (
        <View>
          <Text style={styles.sectionTitle}>Motivo de la excepción</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Ej: no contesta, fuera del rango de edad..."
            placeholderTextColor="#94A3B8"
            value={exceptionReason}
            onChangeText={setExceptionReason}
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('idle')}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]}
              onPress={moveToException}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>Mover</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 48 },
  backBtn: { marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  phone: { fontSize: 15, color: '#64748B', marginTop: 4, marginBottom: 20 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#25D366', borderRadius: 10,
    paddingVertical: 13,
  },
  whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 24 },
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  actionBtnDanger: { borderColor: '#FEE2E2' },
  actionBtnText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1E293B' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  groupItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8,
  },
  groupItemSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  groupName: { fontSize: 15, color: '#1E293B' },
  reasonInput: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1E293B',
    minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, padding: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  confirmBtn: {
    flex: 1, backgroundColor: '#2563EB',
    borderRadius: 8, padding: 13, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
