import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../types';
import IntegrarScreen from '../screens/IntegrarScreen';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Form')}>
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: styles.tabBar,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Integrar" component={IntegrarScreen} />
        <Tab.Screen name="Grupos" component={GruposScreen} />
        <Tab.Screen name="Notificaciones" component={NotificacionesScreen} />
        <Tab.Screen name="Perfil" component={PerfilScreen} />
      </Tab.Navigator>
      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
    height: 60,
    paddingBottom: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 76,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
});
