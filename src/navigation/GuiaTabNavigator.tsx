import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import GuiaHomeScreen from '../screens/GuiaHomeScreen';
import GuiaGrupoScreen from '../screens/GuiaGrupoScreen';
import GuiaPerfilScreen from '../screens/GuiaPerfilScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Personas: 'people-outline',
  'Mi Grupo': 'compass-outline',
  Perfil: 'person-outline',
};

export default function GuiaTabNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.purple,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          borderTopColor: theme.border,
          backgroundColor: theme.tabBar,
          height: 60 + bottomPad,
          paddingBottom: 8 + bottomPad,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Personas" component={GuiaHomeScreen} />
      <Tab.Screen name="Mi Grupo" component={GuiaGrupoScreen} />
      <Tab.Screen name="Perfil" component={GuiaPerfilScreen} />
    </Tab.Navigator>
  );
}
