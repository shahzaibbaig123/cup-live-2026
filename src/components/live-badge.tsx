import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

export function LiveBadge({ clock }: { clock?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <ThemedText type="smallBold" style={styles.text}>
        {clock ? `LIVE ${clock}` : 'LIVE'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.live,
  },
  text: {
    color: Palette.live,
  },
});
