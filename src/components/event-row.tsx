import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { MatchEvent } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

function EventIcon({ event }: { event: MatchEvent }) {
  switch (event.type) {
    case 'goal':
      return <Ionicons name="football" size={18} color={Palette.text} />;
    case 'own-goal':
      return <Ionicons name="football" size={18} color={Palette.redCard} />;
    case 'missed-penalty':
      return <Ionicons name="close-circle-outline" size={18} color={Palette.redCard} />;
    case 'yellow-card':
      return <View style={[styles.cardIcon, { backgroundColor: Palette.yellowCard }]} />;
    case 'red-card':
      return <View style={[styles.cardIcon, { backgroundColor: Palette.redCard }]} />;
    case 'substitution':
      return <Ionicons name="swap-horizontal" size={18} color={Palette.accent} />;
    case 'var':
      return <Ionicons name="tv-outline" size={18} color={Palette.textSecondary} />;
    default:
      return <View style={styles.dot} />;
  }
}

/** Whistle moments (kickoff, half-time, full-time) render as separators. */
export function isPeriodMarker(event: MatchEvent) {
  return event.type === 'kickoff' || event.type === 'halftime' || event.type === 'fulltime';
}

export function EventRow({ event }: { event: MatchEvent }) {
  if (isPeriodMarker(event)) {
    return (
      <View style={styles.marker}>
        <View style={styles.markerLine} />
        <ThemedText type="caption" secondary>
          {event.typeText.toUpperCase()}
        </ThemedText>
        <View style={styles.markerLine} />
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" secondary style={styles.minute}>
        {event.minute}
      </ThemedText>
      <View style={styles.icon}>
        <EventIcon event={event} />
      </View>
      <View style={styles.body}>
        <ThemedText type="small">{event.title}</ThemedText>
        {event.detail && event.detail !== event.title ? (
          <ThemedText type="caption" secondary numberOfLines={3}>
            {event.detail}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'flex-start',
  },
  minute: {
    width: 36,
    textAlign: 'right',
  },
  icon: {
    width: 22,
    alignItems: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  cardIcon: {
    width: 12,
    height: 16,
    borderRadius: 2,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.textSecondary,
    marginTop: 6,
  },
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  markerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.border,
    borderRadius: Radius.sm,
  },
});
