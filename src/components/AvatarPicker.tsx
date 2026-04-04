import React, { useState } from 'react';
import {
  View, Image, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  avatarUrl: string | null;
  size?: number;
  accentColor?: string;
  onUploaded: (url: string) => void;
};

export default function AvatarPicker({
  userId,
  avatarUrl,
  size = 90,
  accentColor = '#7C3AED',
  onUploaded,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const pick = () => {
    Alert.alert('Foto de perfil', 'Elige una opción', [
      { text: 'Cámara', onPress: () => launch('camera') },
      { text: 'Galería de fotos', onPress: () => launch('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const launch = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa el acceso a la cámara en Ajustes.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa el acceso a las fotos en Ajustes.');
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true, aspect: [1, 1], quality: 0.75,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.75,
        });

    if (result.canceled) return;
    await upload(result.assets[0].uri);
  };

  const upload = async (uri: string) => {
    setUploading(true);
    try {
      // Leer el archivo como base64 y decodificar a ArrayBuffer
      // (fetch().blob() no funciona con file:// URIs en React Native)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decode(base64);
      const path = `${userId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (dbError) throw dbError;

      onUploaded(urlWithBust);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const borderRadius = size / 2;

  return (
    <TouchableOpacity onPress={pick} style={[styles.wrapper, { width: size, height: size }]} activeOpacity={0.8}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: size, height: size, borderRadius }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius, backgroundColor: accentColor + '22' }]}>
          <Ionicons name="person" size={size * 0.45} color={accentColor} />
        </View>
      )}

      {uploading ? (
        <View style={[styles.overlay, { borderRadius }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  image: { resizeMode: 'cover' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
});
