import { StyleSheet, View } from 'react-native';

import type { Group, StandingRow } from '@/api/types';
import { TeamLogo } from '@/components/team-logo';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

const COLUMNS = ['P', 'W', 'D', 'L', 'GD', 'Pts'] as const;

function Row({ row }: { row: StandingRow }) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.rankBar,
          row.note?.color ? { backgroundColor: row.note.color } : null,
        ]}
      />
      <ThemedText type="caption" secondary style={styles.rank}>
        {row.rank}
      </ThemedText>
      <TeamLogo uri={row.team.logo} size={20} />
      <ThemedText type="small" numberOfLines={1} style={styles.team}>
        {row.team.name}
      </ThemedText>
      <ThemedText type="small" secondary style={styles.stat}>
        {row.played}
      </ThemedText>
      <ThemedText type="small" secondary style={styles.stat}>
        {row.wins}
      </ThemedText>
      <ThemedText type="small" secondary style={styles.stat}>
        {row.draws}
      </ThemedText>
      <ThemedText type="small" secondary style={styles.stat}>
        {row.losses}
      </ThemedText>
      <ThemedText type="small" secondary style={styles.statWide}>
        {row.goalDiff}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.statWide}>
        {row.points}
      </ThemedText>
    </View>
  );
}

export function GroupTable({ group }: { group: Group }) {
  return (
    <View style={styles.card}>
      <ThemedText type="subtitle" style={styles.title}>
        {group.name}
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.rankBar} />
        <ThemedText type="caption" secondary style={styles.rank}>
          #
        </ThemedText>
        <View style={{ width: 20 }} />
        <ThemedText type="caption" secondary style={styles.team}>
          Team
        </ThemedText>
        {COLUMNS.map((col) => (
          <ThemedText
            key={col}
            type="caption"
            secondary
            style={col.length > 1 ? styles.statWide : styles.stat}>
            {col}
          </ThemedText>
        ))}
      </View>
      {group.rows.map((row) => (
        <Row key={row.team.id || String(row.rank)} row={row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
    gap: Spacing.one,
  },
  title: {
    marginLeft: Spacing.three,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  rankBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: Spacing.two,
  },
  rank: {
    width: 14,
  },
  team: {
    flex: 1,
    marginLeft: Spacing.one,
  },
  stat: {
    width: 22,
    textAlign: 'center',
  },
  statWide: {
    width: 32,
    textAlign: 'center',
  },
});
