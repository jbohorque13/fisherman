import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { formatPhoneInput, isValidPhone } from '../lib/phoneUtils';
import { UserProfile } from '../hooks/useProfile';

type Props = {
  profile: UserProfile;
  onComplete: () => void;
};

export default function GuiaOnboardingScreen({ profile, onComplete }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhoneInput(val));
  };

  const guardar = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert('Teléfono inválido', 'Ingresá un número con al menos 10 dígitos.\nEjemplo: +54 911 1234 5678');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone.trim() })
      .eq('id', profile.id);
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    onComplete();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={48} color={theme.purple} />
        </View>

        <Text style={styles.title}>Completá tu perfil</Text>
        <Text style={styles.subtitle}>
          Para recibir asignaciones de personas necesitamos tu número de WhatsApp.
          El bot te avisará cada vez que alguien nuevo sea asignado a tu grupo.
        </Text>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={theme.purple} />
          <Text style={styles.infoText}>
            Sin teléfono no podés recibir nuevas asignaciones.
          </Text>
        </View>

        <Text style={styles.label}>Tu número de WhatsApp *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="+54 9 11 1234 5678"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          autoFocus
          maxLength={20}
        />
        <Text style={styles.hint}>Argentina: +54 9 11 XXXX XXXX — el 9 va después del código de país</Text>

        <TouchableOpacity style={styles.saveBtn} onPress={guardar} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : (
              <View style={styles.saveBtnInner}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar y continuar</Text>
              </View>
            )
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 32, paddingTop: 80, alignItems: 'center' },
    iconWrap: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: theme.purpleSurface,
      justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    },
    title: { fontSize: 24, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    infoCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.purpleSurface, borderRadius: 10,
      padding: 14, marginBottom: 32, alignSelf: 'stretch',
    },
    infoText: { flex: 1, fontSize: 13, color: theme.purple, fontWeight: '500' },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, alignSelf: 'stretch', marginBottom: 6 },
    input: {
      borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10,
      padding: 14, fontSize: 17, color: theme.text,
      backgroundColor: theme.surface, alignSelf: 'stretch',
      letterSpacing: 1,
    },
    hint: { fontSize: 12, color: theme.textMuted, alignSelf: 'stretch', marginTop: 6, marginBottom: 32 },
    saveBtn: {
      backgroundColor: theme.purple, borderRadius: 12,
      paddingVertical: 16, paddingHorizontal: 32,
      alignSelf: 'stretch', alignItems: 'center',
    },
    saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
