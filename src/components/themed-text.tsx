import { StyleSheet, Text, type TextProps } from 'react-native';

import { Palette } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'caption';
  secondary?: boolean;
};

export function ThemedText({ style, type = 'default', secondary, ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: secondary ? Palette.textSecondary : Palette.text },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
});
