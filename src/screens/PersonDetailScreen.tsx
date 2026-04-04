import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Linking, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { notifyIntegradorRejected, notifyIntegradorIntegrated } from '../lib/notifications';

type Status = 'integrated' | 'in_process' | 'not_interested' | 'error';
type Props = { navigation: NativeStackNavigationProp<any>; route: RouteProp<any> };

const STATUS_OPTIONS: { value: Status; label: string; color: string; icon: string }[] = [
  { value: 'integrated',     label: 'Integrado',     color: '#10B981', icon: 'checkmark-circle' },
  { value: 'in_process',     label: 'En proceso',    color: '#F59E0B', icon: 'time' },
  { value: 'not_interested', label: 'Desinteresado', color: '#64748B', icon: 'remove-circle' },
  { value: 'error',          label: 'Error',         color: '#EF4444', icon: 'alert-circle' },
];

export default function PersonDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const { person, onDone } = route.params as any;
  const isPending = person.status === 'pending';

  const [loading, setLoading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showErrorInput, setShowErrorInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [errorReason, setErrorReason] = useState('');

  const openWhatsApp = () => {
    const clean = person.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
  };

  const acceptAssignment = async () => {
    setLoading(true);
    const { error } = await supabase.from('assigned_people').update({ status: 'in_process' }).eq('id', person.id);
    setLoading(false);
    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Aceptado', 'Persona en proceso de integración', [{ text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } }]);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return Alert.alert('Requerido', 'Escribe el motivo del rechazo');
    setLoading(true);
    try {
      const { error } = await supabase.from('assigned_people').update({ status: 'rejected' }).eq('id', person.id);
      if (error) throw error;
      if (person.created_by) await notifyIntegradorRejected(person.created_by, person.full_name, rejectReason.trim());
      Alert.alert('Rechazado', 'La persona fue devuelta al integrador', [{ text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } }]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: Status) => {
    if (status === 'error') { setShowErrorInput(true); return; }
    await doUpdate(status);
  };

  const doUpdate = async (status: Status, reason?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let grupoId: string | null = null;
      if (status === 'integrated' && user) {
        const { data: grupoData } = await supabase.from('grupos').select('id').eq('guide_id', user.id).maybeSingle();
        grupoId = grupoData?.id ?? null;
      }
      const updatePayload: any = { status };
      if (grupoId) updatePayload.grupo_id = grupoId;
      const { error } = await supabase.from('assigned_people').update(updatePayload).eq('id', person.id);
      if (error) throw error;
      if (status === 'error' && reason) await supabase.from('exceptions').insert({ person_id: person.id, reason });
      if (status === 'integrated' && person.created_by) await notifyIntegradorIntegrated(person.created_by, person.full_name);
      const option = STATUS_OPTIONS.find((o) => o.value === status);
      Alert.alert('Guardado', `Estado: ${option?.label}`, [{ text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } }]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
      </TouchableOpacity>

      <Text style={styles.name}>{person.full_name}</Text>
      <Text style={styles.phone}>{person.phone}</Text>

      <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        <Text style={styles.whatsappBtnText}>Contactar por WhatsApp</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {isPending && !showRejectInput && (
        <>
          <Text style={styles.sectionTitle}>Nueva asignación</Text>
          <Text style={styles.sectionSubtitle}>El integrador te asignó esta persona. ¿La aceptas para integrar a tu grupo?</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => setShowRejectInput(true)} disabled={loading}>
              <Ionicons name="close-circle" size={18} color={theme.danger} />
              <Text style={styles.rejectBtnText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptAssignment} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.acceptBtnText}>Aceptar</Text></>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {isPending && showRejectInput && (
        <>
          <Text style={styles.sectionTitle}>Motivo del rechazo</Text>
          <TextInput style={styles.reasonInput} placeholder="Ej: no coincide con el grupo, ya tiene guía..." placeholderTextColor={theme.textMuted} value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={3} />
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowRejectInput(false); setRejectReason(''); }}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.danger }]} onPress={confirmReject} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirmar rechazo</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {!isPending && (
        <>
          <Text style={styles.sectionTitle}>Actualizar estado</Text>
          {!showErrorInput ? (
            <View style={styles.actions}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} style={[styles.actionBtn, { borderColor: opt.color + '44' }]} onPress={() => updateStatus(opt.value)} disabled={loading}>
                  <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                  <Text style={[styles.actionBtnText, { color: opt.color }]}>{opt.label}</Text>
                  {loading ? <ActivityIndicator size="small" color={opt.color} /> : <Ionicons name="chevron-forward" size={16} color={theme.borderInput} />}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <Text style={styles.errorLabel}>Motivo del error</Text>
              <TextInput style={styles.reasonInput} placeholder="Ej: no contesta, número equivocado..." placeholderTextColor={theme.textMuted} value={errorReason} onChangeText={setErrorReason} multiline numberOfLines={3} />
              <View style={styles.row}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowErrorInput(false); setErrorReason(''); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.danger }]} onPress={() => doUpdate('error', errorReason.trim())} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Guardar error</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.surface },
    content: { padding: 20, paddingBottom: 48 },
    backBtn: { marginBottom: 16 },
    name: { fontSize: 24, fontWeight: '700', color: theme.text },
    phone: { fontSize: 15, color: theme.textSecondary, marginTop: 4, marginBottom: 20 },
    whatsappBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.whatsapp, borderRadius: 10, paddingVertical: 13 },
    whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.surfaceAlt, marginVertical: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },
    sectionSubtitle: { fontSize: 13, color: theme.textSecondary, marginBottom: 16, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: theme.dangerBorder, borderRadius: 10, padding: 13, backgroundColor: theme.dangerSurface },
    rejectBtnText: { color: theme.danger, fontSize: 14, fontWeight: '600' },
    acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.success, borderRadius: 10, padding: 13 },
    acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    actions: { gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, backgroundColor: theme.surface },
    actionBtnText: { flex: 1, fontSize: 15, fontWeight: '500' },
    reasonInput: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, padding: 12, fontSize: 14, color: theme.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 8, backgroundColor: theme.surface },
    errorLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 13, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
    confirmBtn: { flex: 1, borderRadius: 8, padding: 13, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  });
}
