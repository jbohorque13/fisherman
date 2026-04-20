import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Keyboard, Platform, Animated,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import { notifyAdminsUserWaiting } from '../lib/notifications';
import { UserProfile } from '../hooks/useProfile';
import { useTheme } from '../lib/theme';

type Props = {
  profile: UserProfile;
  onRefresh: () => void;
};

export default function PendingScreen({ profile, onRefresh }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const isAlreadyComplete = !!(profile.full_name?.trim() && profile.phone?.trim() && profile.age);

  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sent, setSent] = useState(false);
  const [profileSaved, setProfileSaved] = useState(isAlreadyComplete);

  const canSave = fullName.trim().length > 0 && phone.trim().length > 0 && age.trim().length > 0;

  // Overlay animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const planeX = useRef(new Animated.Value(0)).current;
  const planeY = useRef(new Animated.Value(0)).current;
  const planeScale = useRef(new Animated.Value(1)).current;
  const planeOpacity = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Status card entrance
  const statusCardAnim = useRef(new Animated.Value(isAlreadyComplete ? 1 : 0)).current;

const runSuccessAnimation = () => {
    Animated.timing(overlayOpacity, {
      toValue: 1, duration: 250, useNativeDriver: true,
    }).start(() => {
      Animated.parallel([
        Animated.timing(planeX, { toValue: 130, duration: 750, useNativeDriver: true }),
        Animated.timing(planeY, { toValue: -200, duration: 750, useNativeDriver: true }),
        Animated.timing(planeScale, { toValue: 0.2, duration: 750, useNativeDriver: true }),
        Animated.timing(planeOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(checkScale, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }).start();
        Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
          Animated.timing(textOpacity, {
            toValue: 1, duration: 400, delay: 200, useNativeDriver: true,
          }).start(() => {
            setTimeout(() => {
              setProfileSaved(true);
              Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(statusCardAnim, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
              ]).start(() => setSent(false));
            }, 1500);
          });
        });
      });
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        age: parseInt(age, 10),
        address: address.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    setSent(true);
    runSuccessAnimation();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      // onRefresh(),
      notifyAdminsUserWaiting(profile.email, profile.full_name ?? undefined).catch(() => {}),
    ]);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 16 : 32}
        showsVerticalScrollIndicator={false}
      >
        {profileSaved && (
          <Animated.View style={[styles.statusCard, {
            opacity: statusCardAnim,
            transform: [{
              translateY: statusCardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
            }],
          }]}>
            <Ionicons name="time-outline" size={40} color={theme.warning} />
            <Text style={styles.statusTitle}>Cuenta en revisión</Text>
            <Text style={styles.statusSubtitle}>
              Un administrador asignará tu rol pronto.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.warning} />
              ) : (
                <Text style={styles.retryBtnText}>↻ Verificar estado</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <Text style={styles.sectionTitle}>Tu información</Text>

        <Text style={styles.label}>Nombre completo *</Text>
        <TextInput
          style={[styles.input, profileSaved && styles.inputLocked]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Juan Pérez"
          placeholderTextColor={theme.textMuted}
          returnKeyType="next"
          editable={!profileSaved}
        />

        <Text style={styles.label}>Edad *</Text>
        <TextInput
          style={[styles.input, profileSaved && styles.inputLocked]}
          value={age}
          onChangeText={setAge}
          placeholder="30"
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
          returnKeyType="next"
          editable={!profileSaved}
        />

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={[styles.input, profileSaved && styles.inputLocked]}
          value={address}
          onChangeText={setAddress}
          placeholder="Calle 123, Ciudad"
          placeholderTextColor={theme.textMuted}
          returnKeyType="next"
          editable={!profileSaved}
        />

        <Text style={styles.label}>Teléfono *</Text>
        <TextInput
          style={[styles.input, profileSaved && styles.inputLocked]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          editable={!profileSaved}
        />

        {!profileSaved && (
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Guardar perfil</Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()}>
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {sent && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Animated.View style={{
            transform: [{ translateX: planeX }, { translateY: planeY }, { scale: planeScale }],
            opacity: planeOpacity,
          }}>
            <Ionicons name="send" size={72} color={theme.purple} />
          </Animated.View>

          <Animated.View style={[styles.successContent, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={60} color="#fff" />
            </View>
          </Animated.View>

          <Animated.View style={[styles.successText, { opacity: textOpacity }]}>
            <Text style={styles.successTitle}>¡Datos enviados!</Text>
            <Text style={styles.successSubtitle}>
              Pronto el administrador asignará tu rol.
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 24, paddingBottom: 48 },
    statusCard: {
      backgroundColor: theme.warningSurface,
      borderWidth: 1,
      borderColor: theme.warningBorder,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 32,
    },
    statusTitle: {
      fontSize: 20, fontWeight: '700', color: theme.warningText,
      marginTop: 12, marginBottom: 8,
    },
    statusSubtitle: {
      fontSize: 14, color: '#B45309', textAlign: 'center', lineHeight: 20,
    },
    retryBtn: {
      marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 8, borderWidth: 1, borderColor: theme.warning,
      minWidth: 140, alignItems: 'center',
    },
    retryBtnText: { color: theme.warning, fontWeight: '600', fontSize: 14 },
    sectionTitle: {
      fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 16,
    },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8,
      padding: 12, fontSize: 15, color: theme.text, backgroundColor: theme.surface,
    },
    inputLocked: { backgroundColor: theme.surfaceAlt, color: theme.textMuted, borderColor: theme.borderInput },
    saveBtn: {
      backgroundColor: theme.primary, borderRadius: 8,
      padding: 14, alignItems: 'center', marginTop: 28,
    },
    saveBtnDisabled: { backgroundColor: theme.textMuted, opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    logoutBtn: { padding: 14, alignItems: 'center', marginTop: 12 },
    logoutBtnText: { color: theme.textMuted, fontSize: 14 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successContent: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkCircle: {
      width: 110, height: 110, borderRadius: 55,
      backgroundColor: '#22c55e',
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#22c55e', shadowOpacity: 0.35,
      shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    successText: {
      position: 'absolute',
      bottom: '28%',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    successTitle: {
      fontSize: 26, fontWeight: '800', color: theme.text,
      marginBottom: 10, textAlign: 'center',
    },
    successSubtitle: {
      fontSize: 16, color: theme.textSecondary,
      textAlign: 'center', lineHeight: 24,
    },
  });
}
