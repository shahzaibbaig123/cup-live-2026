import { Platform } from 'react-native';

/**
 * Single dark palette — the app is dark-only (score-app style),
 * independent of the device color scheme.
 */
export const Palette = {
  background: '#0A0F1A',
  card: '#141C2B',
  cardPressed: '#1B2538',
  border: '#22304A',
  text: '#F1F5F9',
  textSecondary: '#8C97AB',
  accent: '#3CCB7F',
  accentText: '#06270F',
  live: '#F43F5E',
  yellowCard: '#FACC15',
  redCard: '#EF4444',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const MaxContentWidth = 800;
