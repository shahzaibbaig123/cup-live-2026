import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Match, MatchTeam } from '@/api/types';
import { LiveBadge } from '@/components/live-badge';
import { TeamLogo } from '@/components/team-logo';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { formatKickoffTime } from '@/lib/dates';

function TeamLine({ team, match }: { team: MatchTeam; match: Match }) {
  const finishedLoser = match.status === 'post' && !team.winner && team.score !== undefined;
  return (
    <View style={styles.teamRow}>
      <TeamLogo uri={team.logo} size={26} />
      <ThemedText
        numberOfLines={1}
        style={[styles.teamName, finishedLoser && styles.dimmed]}>
        {team.name}
      </ThemedText>
      {team.score !== undefined ? (
        <ThemedText type="subtitle" style={[styles.score, finishedLoser && styles.dimmed]}>
          {team.score}
        </ThemedText>
      ) : null}
    </View>
  );
}

function MatchStatusLabel({ match }: { match: Match }) {
  if (match.status === 'in') {
    return <LiveBadge clock={match.displayClock} />;
  }
  if (match.status === 'post') {
    return (
      <ThemedText type="smallBold" secondary>
        FT
      </ThemedText>
    );
  }
  return <ThemedText type="smallBold">{formatKickoffTime(match.date)}</ThemedText>;
}

export function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const context = [match.stage, match.city].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.headerRow}>
        <ThemedText type="caption" secondary numberOfLines={1} style={styles.context}>
          {context}
        </ThemedText>
        <MatchStatusLabel match={match} />
      </View>
      <TeamLine team={match.home} match={match} />
      <TeamLine team={match.away} match={match} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardPressed: {
    backgroundColor: Palette.cardPressed,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  context: {
    flexShrink: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  teamName: {
    flex: 1,
  },
  score: {
    minWidth: 24,
    textAlign: 'right',
  },
  dimmed: {
    color: Palette.textSecondary,
  },
});
