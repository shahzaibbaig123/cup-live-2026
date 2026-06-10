import { useRef } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { formatWeekday, isToday, toDateParam } from '@/lib/dates';

const CHIP_WIDTH = 52;
const CHIP_GAP = Spacing.two;

interface DateStripProps {
  days: Date[];
  selected: string;
  onSelect: (dateParam: string) => void;
}

export function DateStrip({ days, selected, onSelect }: DateStripProps) {
  const listRef = useRef<FlatList<Date>>(null);
  const selectedIndex = Math.max(
    0,
    days.findIndex((d) => toDateParam(d) === selected),
  );

  return (
    <FlatList
      ref={listRef}
      data={days}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={toDateParam}
      initialScrollIndex={selectedIndex}
      getItemLayout={(_, index) => ({
        length: CHIP_WIDTH + CHIP_GAP,
        offset: (CHIP_WIDTH + CHIP_GAP) * index,
        index,
      })}
      contentContainerStyle={styles.content}
      style={styles.list}
      renderItem={({ item }) => {
        const param = toDateParam(item);
        const isSelected = param === selected;
        return (
          <Pressable onPress={() => onSelect(param)}>
            <View
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                !isSelected && isToday(item) && styles.chipToday,
              ]}>
              <ThemedText
                type="caption"
                style={{
                  color: isSelected ? Palette.accentText : Palette.textSecondary,
                }}>
                {formatWeekday(item)}
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={isSelected ? { color: Palette.accentText } : undefined}>
                {item.getDate()}
              </ThemedText>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: CHIP_GAP,
  },
  chip: {
    width: CHIP_WIDTH,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Palette.card,
    gap: Spacing.half,
  },
  chipSelected: {
    backgroundColor: Palette.accent,
  },
  chipToday: {
    borderWidth: 1,
    borderColor: Palette.accent,
  },
});
