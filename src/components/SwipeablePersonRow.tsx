import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

type Person = { id: string; full_name: string; phone: string; status: string };
type Props = { person: Person; onDelete: (id: string) => void };

const STATUS_DOT: Record<string, string> = {
  pending:    '#F59E0B',
  in_process: '#3B82F6',
  integrated: '#10B981',
  rejected:   '#EF4444',
};
const STATUS_LABEL: Record<string, string> = {
  pending:    'En espera',
  in_process: 'En proceso',
  integrated: 'Integrado',
  rejected:   'Rechazado',
};

export default function SwipeablePersonRow({ person, onDelete }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const swipeRef = useRef<Swipeable>(null);

  const confirmDelete = () => {
    swipeRef.current?.close();
    Alert.alert('Eliminar persona', `¿Eliminar a ${person.full_name} de tu grupo?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(person.id) },
    ]);
  };

  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={confirmDelete}>
      <Ionicons name="trash" size={22} color="#fff" />
      <Text style={styles.deleteText}>Eliminar</Text>
    </TouchableOpacity>
  );

  const dotColor = STATUS_DOT[person.status] ?? theme.textMuted;

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} rightThreshold={40} overshootRight={false}>
      <View style={styles.card}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.info}>
          <Text style={styles.name}>{person.full_name}</Text>
          <Text style={styles.phone}>{person.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: dotColor + '22' }]}>
          <Text style={[styles.statusText, { color: dotColor }]}>
            {STATUS_LABEL[person.status] ?? person.status}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: theme.surface, padding: 12,
      borderWidth: 1, borderColor: theme.border, borderRadius: 10, marginBottom: 8,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600', color: theme.text },
    phone: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '600' },
    deleteAction: {
      backgroundColor: '#EF4444',
      justifyContent: 'center', alignItems: 'center',
      width: 80, borderRadius: 10, marginBottom: 8, gap: 4,
    },
    deleteText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  });
}
