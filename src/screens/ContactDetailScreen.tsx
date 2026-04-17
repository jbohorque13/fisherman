import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Linking, TextInput, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { notifyGuidePersonAssigned } from '../lib/notifications';
import { TipoGrupo, Modalidad } from '../types';

type Grupo = { id: string; nombre: string; tipo_grupo: TipoGrupo; modalidad: Modalidad; edad_min: number; edad_max: number; capacidad: number };
type GuideWithGrupo = { id: string; full_name: string | null; email: string; avatar_url: string | null; phone: string | null; grupo: Grupo | null };
type PersonaData = { edad: number; genero: string; tipo_grupo: string; modalidad: string };
type Props = { navigation: NativeStackNavigationProp<any>; route: RouteProp<any> };

const TIPO_LABELS: Record<string, string> = { chicas: 'Chicas', chicos: 'Chicos', mixto_solteros: 'Mixto', casados: 'Casados' };

function matchesGrupo(persona: PersonaData | null, grupo: Grupo): boolean {
  if (!persona) return true;
  if (persona.edad < grupo.edad_min || persona.edad > grupo.edad_max) return false;
  if (persona.modalidad !== grupo.modalidad) return false;
  if (persona.genero === 'femenino' && grupo.tipo_grupo === 'chicos') return false;
  if (persona.genero === 'masculino' && grupo.tipo_grupo === 'chicas') return false;
  return true;
}

export default function ContactDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const { contact, onDone } = route.params as any;
  const persona: PersonaData | null = contact.isRejected ? null : (contact.persona ?? null);

  const [guides, setGuides] = useState<GuideWithGrupo[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [mode, setMode] = useState<'idle' | 'assign' | 'exception'>('idle');
  const [loading, setLoading] = useState(false);
  const [loadingGuides, setLoadingGuides] = useState(false);

  useEffect(() => { if (mode === 'assign') loadGuides(); }, [mode]);

  const loadGuides = async () => {
    setLoadingGuides(true);
    try {
      const [profilesRes, gruposRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url, phone').eq('role', 'guia'),
        supabase.from('grupos').select('id, nombre, tipo_grupo, modalidad, edad_min, edad_max, capacidad, guide_id'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (gruposRes.error) throw gruposRes.error;
      const gruposByGuide = new Map((gruposRes.data ?? []).map((g: any) => [g.guide_id, g]));
      const mapped: GuideWithGrupo[] = (profilesRes.data ?? []).map((p: any) => ({
        id: p.id, full_name: p.full_name, email: p.email, avatar_url: p.avatar_url ?? null,
        phone: p.phone ?? null, grupo: gruposByGuide.get(p.id) ?? null,
      }));
      setGuides(mapped.filter((g) => g.grupo && matchesGrupo(persona, g.grupo)));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingGuides(false);
    }
  };

  const openWhatsApp = () => {
    const clean = contact.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
  };

  const assignToGuide = async () => {
    if (!selectedGuide) return Alert.alert('Requerido', 'Selecciona un guía');
    const guide = guides.find((g) => g.id === selectedGuide);
    const grupoId = guide?.grupo?.id ?? null;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (contact.isRejected) {
        const { error } = await supabase.from('assigned_people').update({ status: 'pending', guide_id: selectedGuide, grupo_id: grupoId ?? null }).eq('id', contact.id);
        if (error) throw error;
        notifyGuidePersonAssigned(selectedGuide, contact.name);
        supabase.functions.invoke('notify-guide-whatsapp', { body: { assigned_person_id: contact.id } }).catch(console.error);
      } else {
        const { error } = await supabase.from('pending_contacts').update({ status: 'assigned' }).eq('id', contact.id);
        if (error) throw error;
        const { data: apData, error: apError } = await supabase.from('assigned_people').insert({
          full_name: contact.name, phone: contact.phone, status: 'pending',
          guide_id: selectedGuide, grupo_id: grupoId, created_by: user?.id,
        }).select('id').single();
        if (apError) throw apError;
        notifyGuidePersonAssigned(selectedGuide, contact.name);
        supabase.functions.invoke('notify-guide-whatsapp', { body: { assigned_person_id: apData.id } }).catch(console.error);
      }
      Alert.alert('¡Listo!', 'Persona asignada al guía', [{ text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } }]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveToException = async () => {
    if (!exceptionReason.trim()) { Alert.alert('Escribe el motivo'); return; }
    setLoading(true);
    const [updateRes, insertRes] = await Promise.all([
      supabase.from('pending_contacts').update({ status: 'exception' }).eq('id', contact.id),
      supabase.from('exceptions').insert({ contact_id: contact.id, reason: exceptionReason.trim() }),
    ]);
    setLoading(false);
    const error = updateRes.error ?? insertRes.error;
    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Guardado', 'Movido a excepciones', [{ text: 'OK', onPress: () => { onDone?.(); navigation.goBack(); } }]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
      </TouchableOpacity>

      <Text style={styles.name}>{contact.name}</Text>
      <Text style={styles.phone}>{contact.phone}</Text>

      {persona && (
        <View style={styles.personaBadges}>
          <View style={styles.pbadge}><Text style={styles.pbadgeText}>{persona.edad} años</Text></View>
          <View style={styles.pbadge}><Text style={styles.pbadgeText}>{persona.genero}</Text></View>
          <View style={styles.pbadge}><Text style={styles.pbadgeText}>{TIPO_LABELS[persona.tipo_grupo] ?? persona.tipo_grupo}</Text></View>
          <View style={styles.pbadge}><Text style={styles.pbadgeText}>{persona.modalidad}</Text></View>
        </View>
      )}

      <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        <Text style={styles.whatsappBtnText}>Contactar por WhatsApp</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {mode === 'idle' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setMode('assign')}>
            <Ionicons name="people" size={20} color={theme.primary} />
            <Text style={styles.actionBtnText}>Asignar a un guía</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => setMode('exception')}>
            <Ionicons name="alert-circle" size={20} color={theme.danger} />
            <Text style={[styles.actionBtnText, { color: theme.danger }]}>Mover a excepciones</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {mode === 'assign' && (
        <View>
          <Text style={styles.sectionTitle}>{persona ? 'Guías compatibles' : 'Selecciona un guía'}</Text>
          {loadingGuides ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
          ) : guides.length === 0 ? (
            <View style={styles.emptyGuides}>
              <Ionicons name="people-outline" size={40} color={theme.borderInput} />
              {persona ? (
                <>
                  <Text style={styles.emptyGuidesTitle}>Sin guías compatibles</Text>
                  <Text style={styles.emptyGuidesText}>Ningún grupo activo cumple todos los criterios de esta persona:</Text>
                  <View style={styles.criteriaList}>
                    <Text style={styles.criteriaItem}>• Edad: {persona.edad} años</Text>
                    <Text style={styles.criteriaItem}>• Sexo: {persona.genero}</Text>
                    <Text style={styles.criteriaItem}>• Modalidad: {persona.modalidad}</Text>
                    <Text style={styles.criteriaItem}>• Tipo: {TIPO_LABELS[persona.tipo_grupo] ?? persona.tipo_grupo}</Text>
                  </View>
                  <Text style={styles.emptyGuidesHint}>Puedes moverla a excepciones o esperar a que un guía cree un grupo compatible.</Text>
                </>
              ) : (
                <Text style={styles.emptyGuidesText}>No hay guías con grupos disponibles.</Text>
              )}
            </View>
          ) : (
            guides.map((g) => {
              const selected = selectedGuide === g.id;
              const grupo = g.grupo!;
              const noPhone = !g.phone;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.guideCard, selected && styles.guideCardSelected, noPhone && styles.guideCardDisabled]}
                  onPress={() => noPhone ? Alert.alert('Sin teléfono', `${g.full_name ?? g.email} no tiene número de WhatsApp registrado. No puede recibir asignaciones hasta que complete su perfil.`) : setSelectedGuide(g.id)}
                  activeOpacity={noPhone ? 1 : 0.8}
                >
                  <View style={styles.guideAvatarWrap}>
                    {g.avatar_url ? (
                      <Image source={{ uri: g.avatar_url }} style={[styles.guideAvatar, noPhone && { opacity: 0.4 }]} />
                    ) : (
                      <View style={[styles.guideAvatar, styles.guideAvatarPlaceholder, noPhone && { opacity: 0.4 }]}>
                        <Ionicons name="person" size={22} color={theme.purple} />
                      </View>
                    )}
                    {selected && (
                      <View style={styles.guideCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                      </View>
                    )}
                  </View>
                  <View style={styles.guideInfo}>
                    <Text style={[styles.guideName, selected && { color: theme.primary }, noPhone && { color: theme.textMuted }]}>{g.full_name ?? g.email}</Text>
                    <Text style={styles.grupoName}>{grupo.nombre}</Text>
                    {noPhone && (
                      <View style={styles.noPhoneBadge}>
                        <Ionicons name="warning-outline" size={12} color={theme.danger} />
                        <Text style={styles.noPhoneBadgeText}>Sin teléfono — perfil incompleto</Text>
                      </View>
                    )}
                    {!noPhone && (
                      <View style={styles.grupoBadges}>
                        <View style={styles.gbadge}><Text style={styles.gbadgeText}>{TIPO_LABELS[grupo.tipo_grupo] ?? grupo.tipo_grupo}</Text></View>
                        <View style={styles.gbadge}><Text style={styles.gbadgeText}>{grupo.modalidad}</Text></View>
                        <View style={styles.gbadge}><Text style={styles.gbadgeText}>{grupo.edad_min}–{grupo.edad_max} años</Text></View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setMode('idle'); setSelectedGuide(null); }}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={assignToGuide} disabled={loading || !selectedGuide}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {mode === 'exception' && (
        <View>
          <Text style={styles.sectionTitle}>Motivo de la excepción</Text>
          <TextInput style={styles.reasonInput} placeholder="Ej: no contesta, fuera del rango de edad..." placeholderTextColor={theme.textMuted} value={exceptionReason} onChangeText={setExceptionReason} multiline numberOfLines={3} />
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('idle')}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.danger }]} onPress={moveToException} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Mover</Text>}
            </TouchableOpacity>
          </View>
        </View>
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
    phone: { fontSize: 15, color: theme.textSecondary, marginTop: 4, marginBottom: 12 },
    personaBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    pbadge: { backgroundColor: theme.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    pbadgeText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    whatsappBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.whatsapp, borderRadius: 10, paddingVertical: 13 },
    whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.surfaceAlt, marginVertical: 24 },
    actions: { gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
    actionBtnDanger: { borderColor: theme.dangerSurface },
    actionBtnText: { flex: 1, fontSize: 15, fontWeight: '500', color: theme.text },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 14 },
    emptyGuides: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 8 },
    emptyGuidesTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 4 },
    emptyGuidesText: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' },
    criteriaList: { alignSelf: 'stretch', backgroundColor: theme.background, borderRadius: 10, padding: 12, gap: 4, marginTop: 4 },
    criteriaItem: { fontSize: 13, color: theme.textSecondary },
    emptyGuidesHint: { color: theme.textMuted, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
    guideCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 10 },
    guideCardSelected: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
    guideAvatarWrap: { position: 'relative' },
    guideAvatar: { width: 52, height: 52, borderRadius: 26 },
    guideAvatarPlaceholder: { backgroundColor: theme.purpleSurface, justifyContent: 'center', alignItems: 'center' },
    guideCheck: { position: 'absolute', bottom: -2, right: -2, backgroundColor: theme.surface, borderRadius: 10 },
    guideInfo: { flex: 1 },
    guideName: { fontSize: 15, fontWeight: '700', color: theme.text },
    grupoName: { fontSize: 13, color: theme.textSecondary, marginTop: 2, marginBottom: 6 },
    grupoBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    gbadge: { backgroundColor: theme.purpleSurface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    gbadgeText: { fontSize: 11, color: theme.purple, fontWeight: '600' },
    reasonInput: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, padding: 12, fontSize: 14, color: theme.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 16, backgroundColor: theme.surface },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 13, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
    confirmBtn: { flex: 1, backgroundColor: theme.primary, borderRadius: 8, padding: 13, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    guideCardDisabled: { opacity: 0.6, borderColor: theme.border, backgroundColor: theme.surfaceAlt },
    noPhoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    noPhoneBadgeText: { fontSize: 11, color: theme.danger, fontWeight: '500' },
  });
}
