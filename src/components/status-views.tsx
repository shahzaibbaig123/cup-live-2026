import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Palette.accent} />
    </View>
  );
}

export function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Couldn’t load data</ThemedText>
      <ThemedText type="small" secondary style={styles.centered}>
        Check your connection and try again.
      </ThemedText>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}>
        <ThemedText type="smallBold" style={{ color: Palette.accentText }}>
          Retry
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function EmptyView({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="small" secondary style={styles.centered}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  centered: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.two,
    backgroundColor: Palette.accent,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  retryPressed: {
    opacity: 0.8,
  },
});
