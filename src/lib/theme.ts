import { useColorScheme } from 'react-native';

// ─── Token definitions ────────────────────────────────────────────────────────

export interface AppTheme {
  // Fondos
  background: string;      // pantallas
  surface: string;         // cards, inputs, modals
  surfaceAlt: string;      // inputs deshabilitados, fondos alternativos

  // Texto
  text: string;            // texto principal
  textSecondary: string;   // texto secundario / meta
  textMuted: string;       // placeholders, iconos sutiles

  // Bordes
  border: string;          // cards, divisores
  borderInput: string;     // campos de entrada

  // Primario (azul — integrador/admin)
  primary: string;
  primarySurface: string;  // fondo teñido de azul
  primaryBadge: string;
  primaryBadgeText: string;

  // Guía (morado)
  purple: string;
  purpleSurface: string;

  // Estado: éxito
  success: string;
  successSurface: string;

  // Estado: advertencia / pendiente
  warning: string;
  warningSurface: string;
  warningBorder: string;
  warningText: string;

  // Estado: peligro / rechazo
  danger: string;
  dangerSurface: string;
  dangerBorder: string;

  // Misc
  whatsapp: string;
  overlay: string;

  // Navegación / sistema
  tabBar: string;
  statusBar: 'light' | 'dark';
}

// ─── Tema claro ───────────────────────────────────────────────────────────────

export const light: AppTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  border: '#E2E8F0',
  borderInput: '#CBD5E1',

  primary: '#2563EB',
  primarySurface: '#EFF6FF',
  primaryBadge: '#DBEAFE',
  primaryBadgeText: '#1D4ED8',

  purple: '#7C3AED',
  purpleSurface: '#EDE9FE',

  success: '#10B981',
  successSurface: '#F0FDF4',

  warning: '#F59E0B',
  warningSurface: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',

  danger: '#EF4444',
  dangerSurface: '#FEE2E2',
  dangerBorder: '#FECACA',

  whatsapp: '#25D366',
  overlay: 'rgba(0,0,0,0.4)',

  tabBar: '#FFFFFF',
  statusBar: 'dark',
};

// ─── Tema oscuro ──────────────────────────────────────────────────────────────

export const dark: AppTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  border: '#334155',
  borderInput: '#475569',

  primary: '#3B82F6',
  primarySurface: '#172554',
  primaryBadge: '#1E3A8A',
  primaryBadgeText: '#93C5FD',

  purple: '#A78BFA',
  purpleSurface: '#2E1065',

  success: '#34D399',
  successSurface: '#064E3B',

  warning: '#FBBF24',
  warningSurface: '#1C1400',
  warningBorder: '#92400E',
  warningText: '#FCD34D',

  danger: '#F87171',
  dangerSurface: '#450A0A',
  dangerBorder: '#7F1D1D',

  whatsapp: '#25D366',
  overlay: 'rgba(0,0,0,0.6)',

  tabBar: '#1E293B',
  statusBar: 'light',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
