import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateStrip } from '@/components/date-strip';
import { MatchCard } from '@/components/match-card';
import { EmptyView, ErrorView, LoadingView } from '@/components/status-views';
import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import { useMatchesForDate } from '@/hooks/use-football';
import { clampToTournament, toDateParam, tournamentDays } from '@/lib/dates';

const DAYS = tournamentDays();

export default function MatchesScreen() {
  const [selected, setSelected] = useState(() =>
    toDateParam(clampToTournament(new Date())),
  );
  const { data, isLoading, isError, refetch, isRefetching } =
    useMatchesForDate(selected);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ThemedText type="title" style={styles.heading}>
        Matches
      </ThemedText>
      <DateStrip days={DAYS} selected={selected} onSelect={setSelected} />
      <View style={styles.listWrap}>
        {isLoading ? (
          <LoadingView />
        ) : isError ? (
          <ErrorView onRetry={refetch} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MatchCard match={item} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Palette.accent}
              />
            }
            ListEmptyComponent={
              <EmptyView
                title="No matches this day"
                subtitle="Pick another date to see fixtures."
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  heading: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  listWrap: {
    flex: 1,
    marginTop: Spacing.three,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    flexGrow: 1,
  },
});
