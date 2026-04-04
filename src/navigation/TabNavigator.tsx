import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../types';
import { useTheme } from '../lib/theme';
import IntegrationListScreen from '../screens/IntegrationListScreen';
import GruposScreen from '../screens/GruposScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';
import PerfilScreen from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Integrar: 'people-outline',
  Grupos: 'grid-outline',
  Notificaciones: 'notifications-outline',
  Perfil: 'person-outline',
};

function FAB() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: 76 + bottomPad, backgroundColor: theme.primary }]}
      onPress={() => navigation.navigate('Form')}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: {
            borderTopColor: theme.border,
            backgroundColor: theme.tabBar,
            paddingBottom: 8 + bottomPad,
            height: 60 + bottomPad,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Integrar" component={IntegrationListScreen} />
        <Tab.Screen name="Grupos" component={GruposScreen} />
        <Tab.Screen name="Notificaciones" component={NotificacionesScreen} />
        <Tab.Screen name="Perfil" component={PerfilScreen} />
      </Tab.Navigator>
      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 76,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
});
