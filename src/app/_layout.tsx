import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Palette } from '@/constants/theme';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Palette.accent,
    background: Palette.background,
    card: Palette.card,
    text: Palette.text,
    border: Palette.border,
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
