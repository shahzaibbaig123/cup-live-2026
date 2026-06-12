import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Match, MatchTeam } from '@/api/types';
import { LiveBadge } from '@/components/live-badge';
import { TeamLogo } from '@/components/team-logo';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { formatKickoffTime } from '@/lib/dates';
import { usePredictions } from '@/hooks/use-football';

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

function PredictionHint({ match }: { match: Match }) {
  const { data } = usePredictions();
  const forecast = data?.matches[match.id];
  if (!forecast || match.status !== 'pre') return null;
  const { predicted, pHome, pDraw, pAway } = forecast;
  const label =
    predicted === 'home'
      ? match.home.abbreviation || match.home.shortName
      : predicted === 'away'
        ? match.away.abbreviation || match.away.shortName
        : 'Draw';
  const prob = predicted === 'home' ? pHome : predicted === 'away' ? pAway : pDraw;
  return (
    <View style={styles.hintRow}>
      <Ionicons name="sparkles" size={11} color={Palette.accent} />
      <ThemedText type="caption" secondary>
        {predicted === 'draw' ? 'Draw' : `${label} to win`} · {Math.round(prob * 100)}%
      </ThemedText>
    </View>
  );
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
      <PredictionHint match={match} />
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
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
});
