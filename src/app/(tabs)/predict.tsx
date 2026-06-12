import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TitleOdds } from '@/api/predictions';
import { ErrorView, LoadingView } from '@/components/status-views';
import { TeamLogo } from '@/components/team-logo';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { usePredictions } from '@/hooks/use-football';

type MetricKey = 'winCup' | 'reachFinal' | 'reachR16' | 'winGroup';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'winCup', label: 'Win Cup' },
  { key: 'reachFinal', label: 'Final' },
  { key: 'reachR16', label: 'Last 16' },
  { key: 'winGroup', label: 'Win Group' },
];

const pct = (n: number) => `${(n * 100).toFixed(n >= 0.1 ? 0 : 1)}%`;

function MetricTabs({ value, onChange }: { value: MetricKey; onChange: (k: MetricKey) => void }) {
  return (
    <View style={styles.tabs}>
      {METRICS.map((m) => {
        const active = m.key === value;
        return (
          <Pressable
            key={m.key}
            onPress={() => onChange(m.key)}
            style={[styles.tab, active && styles.tabActive]}>
            <ThemedText
              type="smallBold"
              style={{ color: active ? Palette.accentText : Palette.textSecondary }}>
              {m.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function AccuracyCard({
  accuracy,
  generatedAt,
  timesfmUsed,
}: {
  accuracy: { n: number; hitRate: number | null; rps: number | null };
  generatedAt: string;
  timesfmUsed: boolean;
}) {
  const updated = generatedAt ? new Date(generatedAt) : null;
  return (
    <View style={styles.accuracyCard}>
      <View style={styles.accuracyHeader}>
        <ThemedText type="smallBold">Model accuracy</ThemedText>
        <View style={[styles.badge, { backgroundColor: timesfmUsed ? Palette.accent : Palette.border }]}>
          <ThemedText type="caption" style={{ color: timesfmUsed ? Palette.accentText : Palette.textSecondary }}>
            {timesfmUsed ? 'TimesFM on' : 'Elo+Poisson'}
          </ThemedText>
        </View>
      </View>
      {accuracy.n > 0 ? (
        <View style={styles.metricsRow}>
          <Metric value={pct(accuracy.hitRate ?? 0)} label="hit rate" />
          <Metric value={(accuracy.rps ?? 0).toFixed(3)} label="RPS ↓" />
          <Metric value={String(accuracy.n)} label="games" />
        </View>
      ) : (
        <ThemedText type="caption" secondary>
          No completed matches scored yet — accuracy appears once games are played.
        </ThemedText>
      )}
      {updated ? (
        <ThemedText type="caption" secondary>
          Updated {updated.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="caption" secondary>
        {label}
      </ThemedText>
    </View>
  );
}

function OddsRow({ team, value, max, rank }: { team: TitleOdds; value: number; max: number; rank: number }) {
  return (
    <View style={styles.row}>
      <ThemedText type="caption" secondary style={styles.rank}>
        {rank}
      </ThemedText>
      <TeamLogo uri={team.logo} size={24} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <ThemedText type="small" numberOfLines={1} style={styles.teamName}>
            {team.name}
          </ThemedText>
          <ThemedText type="smallBold">{pct(value)}</ThemedText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${max > 0 ? (value / max) * 100 : 0}%` }]} />
        </View>
      </View>
    </View>
  );
}

export default function PredictScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = usePredictions();
  const [metric, setMetric] = useState<MetricKey>('winCup');

  const ranked = useMemo(() => {
    if (!data) return [];
    return [...data.titleOdds].sort((a, b) => b[metric] - a[metric]);
  }, [data, metric]);

  const max = ranked.length ? ranked[0][metric] : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ThemedText type="title" style={styles.heading}>
        Predictions
      </ThemedText>
      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={ranked}
          keyExtractor={(t) => t.teamId}
          renderItem={({ item, index }) => (
            <OddsRow team={item} value={item[metric]} max={max} rank={index + 1} />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <AccuracyCard
                accuracy={data.accuracy}
                generatedAt={data.generatedAt}
                timesfmUsed={data.timesfmUsed}
              />
              <ThemedText type="caption" secondary style={styles.sectionLabel}>
                {metric === 'winCup'
                  ? 'CHANCE TO WIN THE WORLD CUP'
                  : metric === 'reachFinal'
                    ? 'CHANCE TO REACH THE FINAL'
                    : metric === 'reachR16'
                      ? 'CHANCE TO REACH THE LAST 16'
                      : 'CHANCE TO WIN THEIR GROUP'}
              </ThemedText>
              <MetricTabs value={metric} onChange={setMetric} />
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Palette.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  heading: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  listContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  header: { gap: Spacing.three, paddingBottom: Spacing.two },
  accuracyCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  accuracyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm },
  metricsRow: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
  metric: { alignItems: 'flex-start', minWidth: 64 },
  sectionLabel: { textTransform: 'uppercase' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: Spacing.half,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radius.sm },
  tabActive: { backgroundColor: Palette.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  rank: { width: 20, textAlign: 'center' },
  rowBody: { flex: 1, gap: Spacing.one },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  teamName: { flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: Palette.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: Palette.accent },
});
