import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ActionSheetIOS, Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import { notifyUserRoleAssigned, notifyGuideCompleteProfile } from '../lib/notifications';
import { useTheme } from '../lib/theme';
import AdminReportTab from './AdminReportTab';
import AdminImportTab from './AdminImportTab';
import AdminPeopleTab from './AdminPeopleTab';

type UserRole = 'pending' | 'integrador' | 'guia' | 'admin';

type User = {
  id: string;
  email: string;
  full_name: string | null;
  age: number | null;
  role: UserRole;
};

const ROLE_LABELS: Record<UserRole, string> = {
  pending: 'Pendiente',
  integrador: 'Integrador',
  guia: 'Guía',
  admin: 'Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  pending: '#F59E0B',
  integrador: '#2563EB',
  guia: '#7C3AED',
  admin: '#DC2626',
};

type Tab = 'pending' | 'all' | 'ai' | 'report' | 'import' | 'people';

type AILog = {
  id: string;
  ran_at: string;
  processed: number;
  assigned: number;
  skipped: number;
  error: string | null;
  model: string;
};

export default function AdminScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('pending');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [aiRunning, setAiRunning] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, age, role')
      .order('created_at');

    if (error) Alert.alert('Error', error.message);
    else {
      const users = (data ?? []) as User[];
      setPendingUsers(users.filter((u) => u.role === 'pending'));
      setAllUsers(users);
    }
    setLoading(false);
  };

  const assignRole = async (userId: string, role: 'integrador' | 'guia') => {
    const roleLabel = ROLE_LABELS[role];
    Alert.alert('Confirmar', `¿Asignar como ${roleLabel}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setAssigning(userId);
          const { error } = await supabase
            .from('profiles').update({ role }).eq('id', userId);
          setAssigning(null);
          if (error) return Alert.alert('Error', error.message);
          notifyUserRoleAssigned(userId, role);
          if (role === 'guia') notifyGuideCompleteProfile(userId).catch(() => {});
          await loadAll();
        },
      },
    ]);
  };

  const changeRole = (user: User) => {
    const roles: UserRole[] = ['admin', 'integrador', 'guia', 'pending'];
    const options = roles.map((r) => ROLE_LABELS[r]);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: user.full_name ?? user.email,
          message: `Rol actual: ${ROLE_LABELS[user.role]}`,
          options: [...options, 'Cancelar'],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: roles.indexOf('pending'),
        },
        (index) => {
          if (index < roles.length) applyRole(user, roles[index]);
        },
      );
    } else {
      Alert.alert(
        user.full_name ?? user.email,
        `Rol actual: ${ROLE_LABELS[user.role]}\n\nSeleccionar nuevo rol:`,
        [
          ...roles.map((r) => ({
            text: ROLE_LABELS[r],
            onPress: () => applyRole(user, r),
          })),
          { text: 'Cancelar', style: 'cancel' as const },
        ],
      );
    }
  };

  const loadAILogs = async () => {
    const { data } = await supabase
      .from('ai_assignment_logs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(10);
    setAiLogs((data ?? []) as AILog[]);
  };

  const runAIAssignment = async () => {
    setAiRunning(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'assign-personas-ai',
        { method: 'POST', body: {} }
      );
      if (error) throw new Error(error.message);
      if (!result?.success && result?.error) throw new Error(result.error);
      Alert.alert(
        'Asignación completada',
        result?.message
          ? result.message
          : `${result?.assigned ?? 0} persona(s) asignada(s) de ${result?.processed ?? 0} evaluadas`
      );
      await loadAILogs();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAiRunning(false);
    }
  };

  const applyRole = async (user: User, newRole: UserRole) => {
    if (newRole === user.role) return;
    setAssigning(user.id);
    const { error } = await supabase
      .from('profiles').update({ role: newRole }).eq('id', user.id);
    setAssigning(null);
    if (error) return Alert.alert('Error', error.message);
    if (newRole === 'integrador' || newRole === 'guia') {
      notifyUserRoleAssigned(user.id, newRole);
      if (newRole === 'guia') notifyGuideCompleteProfile(user.id).catch(() => {});
    }
    await loadAll();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Panel Admin</Text>
        <TouchableOpacity onPress={loadAll}>
          <Ionicons name="refresh" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab bar: View wrapper fija el height, ScrollView permite scroll horizontal */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          <TouchableOpacity
            style={[styles.tab, tab === 'pending' && styles.tabActive]}
            onPress={() => setTab('pending')}
          >
            <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
              Pendientes{pendingUsers.length > 0 ? ` ${pendingUsers.length}` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'all' && styles.tabActive]}
            onPress={() => setTab('all')}
          >
            <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'ai' && styles.tabActive]}
            onPress={() => { setTab('ai'); loadAILogs(); }}
          >
            <Text style={[styles.tabText, tab === 'ai' && styles.tabTextActive]}>
              IA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'report' && styles.tabActive]}
            onPress={() => setTab('report')}
          >
            <Text style={[styles.tabText, tab === 'report' && styles.tabTextActive]}>
              Reportes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'import' && styles.tabActive]}
            onPress={() => setTab('import')}
          >
            <Text style={[styles.tabText, tab === 'import' && styles.tabTextActive]}>
              Importar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'people' && styles.tabActive]}
            onPress={() => setTab('people')}
          >
            <Text style={[styles.tabText, tab === 'people' && styles.tabTextActive]}>
              Personas
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Contenido — flex: 1 ocupa el espacio restante */}
      <View style={styles.tabContent}>
        {tab === 'pending' && (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} />
                <Text style={styles.emptyText}>No hay usuarios pendientes</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.full_name ?? '(sin nombre)'}</Text>
                  <Text style={styles.cardEmail}>{item.email}</Text>
                  {item.age ? <Text style={styles.cardMeta}>{item.age} años</Text> : null}
                </View>
                {assigning === item.id ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.roleBtn, { backgroundColor: ROLE_COLORS.integrador }]}
                      onPress={() => assignRole(item.id, 'integrador')}
                    >
                      <Text style={styles.roleBtnText}>Integrador</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleBtn, { backgroundColor: ROLE_COLORS.guia }]}
                      onPress={() => assignRole(item.id, 'guia')}
                    >
                      <Text style={styles.roleBtnText}>Guía</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        )}

        {tab === 'all' && (
          <FlatList
            data={allUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => changeRole(item)}
                disabled={assigning === item.id}
              >
                <View style={styles.userRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.full_name ?? '(sin nombre)'}</Text>
                    <Text style={styles.cardEmail}>{item.email}</Text>
                  </View>
                  {assigning === item.id ? (
                    <ActivityIndicator color={theme.primary} size="small" />
                  ) : (
                    <View style={[styles.rolePill, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
                      <Text style={[styles.rolePillText, { color: ROLE_COLORS[item.role] }]}>
                        {ROLE_LABELS[item.role]}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {tab === 'ai' && (
          <ScrollView contentContainerStyle={styles.list}>
            <TouchableOpacity
              style={[styles.aiBtn, aiRunning && styles.aiBtnDisabled]}
              onPress={runAIAssignment}
              disabled={aiRunning}
            >
              {aiRunning
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="sparkles" size={18} color="#fff" />
              }
              <Text style={styles.aiBtnText}>
                {aiRunning ? 'Asignando...' : 'Ejecutar asignación IA ahora'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.aiSectionTitle}>Últimas 10 ejecuciones</Text>

            {aiLogs.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>Sin ejecuciones aún</Text>
              </View>
            )}

            {aiLogs.map((log) => (
              <View key={log.id} style={[styles.card, log.error ? styles.cardError : null]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.aiLogDate}>
                    {new Date(log.ran_at).toLocaleString('es-AR', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.aiLogModel}>{log.model}</Text>
                </View>
                {log.error ? (
                  <Text style={styles.aiLogError}>{log.error}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={styles.aiLogStat}>
                      <Text style={styles.aiLogStatNum}>{log.processed}</Text> evaluados
                    </Text>
                    <Text style={styles.aiLogStat}>
                      <Text style={[styles.aiLogStatNum, { color: '#16a34a' }]}>{log.assigned}</Text> asignados
                    </Text>
                    {log.skipped > 0 && (
                      <Text style={styles.aiLogStat}>
                        <Text style={[styles.aiLogStatNum, { color: '#d97706' }]}>{log.skipped}</Text> sin match
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {tab === 'report' && <AdminReportTab />}

        {tab === 'import' && <AdminImportTab />}

        {tab === 'people' && <AdminPeopleTab />}
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { paddingBottom: 16 + insets.bottom }]}
        onPress={() => signOut()}
      >
        <Ionicons name="log-out-outline" size={16} color={theme.textMuted} />
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.text },

    // Tab bar: el View fija la altura, el ScrollView no la puede pisar
    tabsWrapper: {
      height: 44,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      height: 44,
      alignItems: 'center',
    },
    tab: {
      height: 44,
      paddingHorizontal: 14,
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: theme.primary },
    tabText: { fontSize: 14, fontWeight: '500', color: theme.textMuted },
    tabTextActive: { color: theme.primary, fontWeight: '600' },

    // Contenido
    tabContent: { flex: 1 },
    list: { padding: 16, gap: 10 },
    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyText: { fontSize: 15, color: theme.textMuted },

    // Cards
    card: {
      backgroundColor: theme.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.border,
    },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: '600', color: theme.text },
    cardEmail: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    cardMeta: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    roleBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
    roleBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    userRow: { flexDirection: 'row', alignItems: 'center' },
    rolePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
    rolePillText: { fontSize: 12, fontWeight: '600' },
    cardError: { borderColor: theme.dangerBorder },

    // Logout
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: 16,
    },
    logoutBtnText: { color: theme.textMuted, fontSize: 14 },

    // IA tab
    aiBtn: {
      backgroundColor: theme.primary, borderRadius: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 13, marginBottom: 20,
    },
    aiBtnDisabled: { opacity: 0.6 },
    aiBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    aiSectionTitle: { fontSize: 13, fontWeight: '600', color: theme.textMuted, marginBottom: 8 },
    aiLogDate: { fontSize: 13, fontWeight: '600', color: theme.text },
    aiLogModel: { fontSize: 11, color: theme.textMuted },
    aiLogStat: { fontSize: 13, color: theme.textSecondary },
    aiLogStatNum: { fontWeight: '700', color: theme.text },
    aiLogError: { fontSize: 13, color: theme.danger },
  });
}
