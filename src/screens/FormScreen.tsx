import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { RootStackParamList, TipoGrupo, Modalidad, Genero } from '../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Form'> };

type FieldKey =
  | 'nombre' | 'apellido' | 'celular' | 'genero'
  | 'edad' | 'email' | 'dias' | 'tipoGrupo' | 'modalidad';

// Para volver un campo opcional en obligatorio (o viceversa) basta con
// mover su key dentro/fuera de este Set.
const REQUIRED_FIELDS: ReadonlySet<FieldKey> = new Set([
  'nombre', 'apellido', 'celular', 'genero',
]);

const FIELD_ORDER: FieldKey[] = [
  'nombre', 'apellido', 'celular', 'genero',
  'edad', 'email', 'dias', 'tipoGrupo', 'modalidad',
];

const FIELD_LABELS: Record<FieldKey, string> = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  celular: 'Celular',
  genero: 'Género',
  edad: 'Edad',
  email: 'Email',
  dias: 'Días disponibles',
  tipoGrupo: 'Tipo de grupo',
  modalidad: 'Modalidad',
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIPOS_GRUPO: { value: TipoGrupo; label: string }[] = [
  { value: 'chicas', label: 'Chicas' },
  { value: 'chicos', label: 'Chicos' },
  { value: 'mixto_solteros', label: 'Mixto Solteros' },
  { value: 'casados', label: 'Casados' },
];
const MODALIDADES: { value: Modalidad; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
];
const GENEROS: { value: Genero; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
];

// Argentina mobile: país +54, prefijo de móvil 9. El usuario carga
// solo desde el código de área en adelante.
const AR_PHONE_PREFIX = '+54';
const AR_PHONE_PREFIX_LABEL = '+54';

export default function FormScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [edad, setEdad] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [genero, setGenero] = useState<Genero | null>(null);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [tipoGrupo, setTipoGrupo] = useState<TipoGrupo | null>(null);
  const [modalidad, setModalidad] = useState<Modalidad | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleOptionals, setVisibleOptionals] = useState<Set<FieldKey>>(new Set());

  const isRequired = (key: FieldKey) => REQUIRED_FIELDS.has(key);
  const isVisible = (key: FieldKey) => isRequired(key) || visibleOptionals.has(key);
  const requiredMark = (key: FieldKey) => (isRequired(key) ? ' *' : '');

  const showOptional = (key: FieldKey) => {
    setVisibleOptionals((prev) => new Set(prev).add(key));
  };

  const isFieldFilled = (key: FieldKey): boolean => {
    switch (key) {
      case 'nombre': return !!nombre.trim();
      case 'apellido': return !!apellido.trim();
      case 'celular': return !!celular.trim();
      case 'email': return !!email.trim();
      case 'edad': return !!edad.trim();
      case 'genero': return !!genero;
      case 'dias': return diasSeleccionados.length > 0;
      case 'tipoGrupo': return !!tipoGrupo;
      case 'modalidad': return !!modalidad;
    }
  };

  const toggleDia = (dia: string) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleSubmit = async () => {
    const missing = FIELD_ORDER.filter((k) => isRequired(k) && !isFieldFilled(k));
    if (missing.length > 0) {
      Alert.alert(
        'Campos requeridos',
        `Completa: ${missing.map((k) => FIELD_LABELS[k]).join(', ')}`,
      );
      return;
    }
    try {
      setLoading(true);
      const fullPhone = celular ? `${AR_PHONE_PREFIX}${celular}` : null;
      const { data: personaData, error } = await supabase
        .from('personas')
        .insert({
          nombre,
          apellido,
          edad: edad ? parseInt(edad, 10) : null,
          celular: fullPhone,
          email: email || null,
          genero,
          dias_disponibles: diasSeleccionados,
          tipo_grupo: tipoGrupo,
          modalidad,
          status: 'en_proceso',
        })
        .select('id').single();
      if (error) throw error;

      const { error: pcError } = await supabase.from('pending_contacts').insert({
        name: `${nombre} ${apellido}`.trim(),
        phone: fullPhone ?? '', status: 'pending', persona_id: personaData.id,
      });
      if (pcError) throw pcError;

      Alert.alert('¡Listo!', 'Persona agregada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (key: FieldKey) => {
    if (!isVisible(key)) return null;
    const label = <Text style={styles.label}>{FIELD_LABELS[key]}{requiredMark(key)}</Text>;

    switch (key) {
      case 'nombre':
        return (
          <View key={key}>
            {label}
            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Juan" placeholderTextColor={theme.textMuted} />
          </View>
        );
      case 'apellido':
        return (
          <View key={key}>
            {label}
            <TextInput style={styles.input} value={apellido} onChangeText={setApellido} placeholder="Pérez" placeholderTextColor={theme.textMuted} />
          </View>
        );
      case 'celular':
        return (
          <View key={key}>
            {label}
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>{AR_PHONE_PREFIX_LABEL}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={celular}
                onChangeText={(v) => setCelular(v.replace(/\D/g, ''))}
                placeholder="11 5555 5555"
                keyboardType="number-pad"
                placeholderTextColor={theme.textMuted}
                maxLength={13}
              />
            </View>
          </View>
        );
      case 'email':
        return (
          <View key={key}>
            {label}
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="juan@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={theme.textMuted} />
          </View>
        );
      case 'edad':
        return (
          <View key={key}>
            {label}
            <TextInput style={styles.input} value={edad} onChangeText={setEdad} placeholder="25" keyboardType="numeric" placeholderTextColor={theme.textMuted} />
          </View>
        );
      case 'genero':
        return (
          <View key={key}>
            {label}
            <View style={styles.chips}>
              {GENEROS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.chip, genero === item.value && styles.chipSelected]}
                  onPress={() => setGenero(item.value)}
                >
                  <Text style={[styles.chipText, genero === item.value && styles.chipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'dias':
        return (
          <View key={key}>
            {label}
            <View style={styles.chips}>
              {DIAS.map((dia) => (
                <TouchableOpacity
                  key={dia}
                  style={[styles.chip, diasSeleccionados.includes(dia) && styles.chipSelected]}
                  onPress={() => toggleDia(dia)}
                >
                  <Text style={[styles.chipText, diasSeleccionados.includes(dia) && styles.chipTextSelected]}>{dia}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'tipoGrupo':
        return (
          <View key={key}>
            {label}
            <View style={styles.chips}>
              {TIPOS_GRUPO.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.chip, tipoGrupo === item.value && styles.chipSelected]}
                  onPress={() => setTipoGrupo(item.value)}
                >
                  <Text style={[styles.chipText, tipoGrupo === item.value && styles.chipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'modalidad':
        return (
          <View key={key}>
            {label}
            <View style={styles.chips}>
              {MODALIDADES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.chip, modalidad === item.value && styles.chipSelected]}
                  onPress={() => setModalidad(item.value)}
                >
                  <Text style={[styles.chipText, modalidad === item.value && styles.chipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
    }
  };

  const addableOptionals = FIELD_ORDER.filter(
    (k) => !isRequired(k) && !visibleOptionals.has(k)
  );

  const canSubmit = FIELD_ORDER.every((k) => !isRequired(k) || isFieldFilled(k));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nueva persona</Text>
      </View>

      {FIELD_ORDER.map(renderField)}

      {addableOptionals.length > 0 && (
        <View style={styles.addSection}>
          <Text style={styles.addLabel}>Agregar más datos</Text>
          <View style={styles.chips}>
            {addableOptionals.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.addChip}
                onPress={() => showOptional(key)}
              >
                <Ionicons name="add" size={14} color={theme.primary} />
                <Text style={styles.addChipText}>{FIELD_LABELS[key]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Agregar persona</Text>}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.surface },
    content: { padding: 24, paddingBottom: 60 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    backBtn: { padding: 4 },
    backText: { fontSize: 18, color: theme.textSecondary },
    title: { fontSize: 22, fontWeight: '700', color: theme.text },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 16 },
    input: {
      borderWidth: 1, borderColor: theme.borderInput,
      borderRadius: 8, padding: 12, fontSize: 15, color: theme.text,
      backgroundColor: theme.surface,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
    phonePrefix: {
      borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8,
      paddingHorizontal: 12, justifyContent: 'center',
      backgroundColor: theme.surfaceAlt,
    },
    phonePrefixText: { fontSize: 15, color: theme.textSecondary, fontWeight: '600' },
    phoneInput: { flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    chipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 14, color: theme.textSecondary },
    chipTextSelected: { color: '#fff', fontWeight: '600' },
    addSection: { marginTop: 24 },
    addLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.primary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.primarySurface,
    },
    addChipText: { fontSize: 13, color: theme.primary, fontWeight: '600' },
    button: { backgroundColor: theme.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32 },
    buttonDisabled: { backgroundColor: theme.textMuted },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
