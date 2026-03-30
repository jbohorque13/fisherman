import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList, TipoGrupo, Modalidad, Genero } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Form'>;
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

export default function FormScreen({ navigation }: Props) {
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

  const toggleDia = (dia: string) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleSubmit = async () => {
    if (!nombre || !apellido || !edad || !genero || !tipoGrupo || !modalidad) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos obligatorios');
      return;
    }
    if (diasSeleccionados.length === 0) {
      Alert.alert('Días requeridos', 'Selecciona al menos un día disponible');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('personas').insert({
        nombre,
        apellido,
        edad: parseInt(edad, 10),
        celular: celular || null,
        email: email || null,
        genero,
        dias_disponibles: diasSeleccionados,
        tipo_grupo: tipoGrupo,
        modalidad,
        status: 'en_proceso',
      });

      if (error) throw error;
      Alert.alert('¡Listo!', 'Persona agregada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nueva persona</Text>
      </View>

      <Text style={styles.label}>Nombre *</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Juan" />

      <Text style={styles.label}>Apellido *</Text>
      <TextInput style={styles.input} value={apellido} onChangeText={setApellido} placeholder="Pérez" />

      <Text style={styles.label}>Edad *</Text>
      <TextInput
        style={styles.input}
        value={edad}
        onChangeText={setEdad}
        placeholder="25"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Celular</Text>
      <TextInput
        style={styles.input}
        value={celular}
        onChangeText={setCelular}
        placeholder="+1 234 567 8900"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="juan@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Género *</Text>
      <View style={styles.chips}>
        {GENEROS.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.chip, genero === item.value && styles.chipSelected]}
            onPress={() => setGenero(item.value)}
          >
            <Text style={[styles.chipText, genero === item.value && styles.chipTextSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Días disponibles *</Text>
      <View style={styles.chips}>
        {DIAS.map((dia) => (
          <TouchableOpacity
            key={dia}
            style={[styles.chip, diasSeleccionados.includes(dia) && styles.chipSelected]}
            onPress={() => toggleDia(dia)}
          >
            <Text style={[styles.chipText, diasSeleccionados.includes(dia) && styles.chipTextSelected]}>
              {dia}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Tipo de grupo *</Text>
      <View style={styles.chips}>
        {TIPOS_GRUPO.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.chip, tipoGrupo === item.value && styles.chipSelected]}
            onPress={() => setTipoGrupo(item.value)}
          >
            <Text style={[styles.chipText, tipoGrupo === item.value && styles.chipTextSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Modalidad *</Text>
      <View style={styles.chips}>
        {MODALIDADES.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.chip, modalidad === item.value && styles.chipSelected]}
            onPress={() => setModalidad(item.value)}
          >
            <Text style={[styles.chipText, modalidad === item.value && styles.chipTextSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Agregar persona</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: '#64748B' },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 14, color: '#475569' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
