import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { Match, MatchEvent, MatchTeam } from '@/api/types';
import { EventRow, isPeriodMarker } from '@/components/event-row';
import { ForecastBar } from '@/components/forecast-bar';
import { LiveBadge } from '@/components/live-badge';
import { TeamLogo } from '@/components/team-logo';
import { ThemedText } from '@/components/themed-text';
import { ErrorView, LoadingView } from '@/components/status-views';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useMatchDetail, usePredictions } from '@/hooks/use-football';
import { formatKickoffDateTime } from '@/lib/dates';

const SHOWN_EVENT_TYPES = new Set<MatchEvent['type']>([
  'goal',
  'own-goal',
  'missed-penalty',
  'yellow-card',
  'red-card',
  'substitution',
  'var',
  'halftime',
  'fulltime',
]);

function TeamColumn({ team }: { team: MatchTeam }) {
  return (
    <View style={styles.teamColumn}>
      <TeamLogo uri={team.logo} size={56} />
      <ThemedText type="smallBold" numberOfLines={2} style={styles.teamName}>
        {team.name}
      </ThemedText>
    </View>
  );
}

function ScoreHeader({ match }: { match: Match }) {
  const started = match.status !== 'pre';
  return (
    <View style={styles.scoreCard}>
      <ThemedText type="caption" secondary>
        {[match.stage, match.venue, match.city].filter(Boolean).join(' · ')}
      </ThemedText>
      <View style={styles.scoreRow}>
        <TeamColumn team={match.home} />
        <View style={styles.scoreCenter}>
          {started ? (
            <ThemedText style={styles.scoreText}>
              {match.home.score ?? 0} – {match.away.score ?? 0}
            </ThemedText>
          ) : (
            <ThemedText type="subtitle" secondary>
              vs
            </ThemedText>
          )}
          {match.status === 'in' ? (
            <LiveBadge clock={match.displayClock} />
          ) : (
            <ThemedText type="smallBold" secondary>
              {match.status === 'post' ? 'Full Time' : formatKickoffDateTime(match.date)}
            </ThemedText>
          )}
        </View>
        <TeamColumn team={match.away} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" secondary>
        {label}
      </ThemedText>
      <ThemedText type="small" numberOfLines={2} style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useMatchDetail(id ?? '');
  const { data: predictions } = usePredictions();
  const forecast = id ? predictions?.matches[id] : undefined;

  const match = data?.match;
  const events = (data?.events ?? []).filter((e) => SHOWN_EVENT_TYPES.has(e.type));
  // A whistle marker with no events above it adds noise; keep the timeline tight.
  while (events.length && isPeriodMarker(events[0])) events.shift();

  const title = match
    ? `${match.home.abbreviation || match.home.shortName} vs ${match.away.abbreviation || match.away.shortName}`
    : 'Match';

  return (
    <>
      <Stack.Screen options={{ title }} />
      {isLoading ? (
        <LoadingView />
      ) : isError || !match ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Palette.accent}
            />
          }>
          <ScoreHeader match={match} />

          {forecast && (
            <View style={styles.card}>
              <View style={styles.forecastTitleRow}>
                <ThemedText type="subtitle">Forecast</ThemedText>
                <ThemedText type="caption" secondary>
                  AI model
                </ThemedText>
              </View>
              <ForecastBar
                forecast={forecast}
                homeLabel={match.home.abbreviation || match.home.shortName}
                awayLabel={match.away.abbreviation || match.away.shortName}
              />
              {match.status === 'post' && forecast.result ? (
                <ThemedText type="caption" secondary style={styles.forecastResult}>
                  {forecast.predicted === forecast.result ? '✓ Predicted correctly' : '✗ Prediction missed'}
                </ThemedText>
              ) : (
                <ThemedText type="caption" secondary style={styles.forecastResult}>
                  Most likely score {forecast.xHome}–{forecast.xAway}
                </ThemedText>
              )}
            </View>
          )}

          {events.length > 0 && (
            <View style={styles.card}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Events
              </ThemedText>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </View>
          )}

          {match.status === 'pre' && events.length === 0 && (
            <View style={styles.card}>
              <ThemedText type="small" secondary>
                Match events — goals, cards and substitutions — will appear here live
                once the game kicks off.
              </ThemedText>
            </View>
          )}

          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Info
            </ThemedText>
            <InfoRow label="Kickoff" value={formatKickoffDateTime(match.date)} />
            <InfoRow
              label="Venue"
              value={[match.venue, match.city].filter(Boolean).join(', ')}
            />
            <InfoRow label="Referee" value={data?.referee} />
            <InfoRow
              label="Attendance"
              value={data?.attendance ? data.attendance.toLocaleString() : undefined}
            />
            <InfoRow
              label="TV"
              value={match.broadcasts.length ? match.broadcasts.join(', ') : undefined}
            />
          </View>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  scoreCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  teamName: {
    textAlign: 'center',
  },
  scoreCenter: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  scoreText: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: 800,
    color: Palette.text,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  cardTitle: {
    marginBottom: Spacing.two,
  },
  forecastTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  forecastResult: {
    marginTop: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
});
