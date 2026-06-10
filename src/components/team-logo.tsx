import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export function TeamLogo({ uri, size = 28 }: { uri?: string; size?: number }) {
  if (!uri) {
    // Knockout placeholders ("Winner Group A") have no crest yet.
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        <ThemedText type="caption" secondary>
          ?
        </ThemedText>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
