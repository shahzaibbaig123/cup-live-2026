import { useEffect, useMemo, useRef } from 'react';
import {
  RefreshControl,
  SectionList,
  type SectionListData,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Match } from '@/api/types';
import { MatchCard } from '@/components/match-card';
import { ErrorView, LoadingView } from '@/components/status-views';
import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import { useAllMatches } from '@/hooks/use-football';
import { formatDayHeader, localDayKey } from '@/lib/dates';

interface DaySection {
  key: string;
  title: string;
  data: Match[];
}

function buildSections(matches: Match[]): DaySection[] {
  const byDay = new Map<string, DaySection>();
  for (const match of matches) {
    const key = localDayKey(match.date);
    let section = byDay.get(key);
    if (!section) {
      section = { key, title: formatDayHeader(new Date(match.date)), data: [] };
      byDay.set(key, section);
    }
    section.data.push(match);
  }
  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export default function ScheduleScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useAllMatches();
  const listRef = useRef<SectionList<Match, DaySection>>(null);
  const sections = useMemo(() => buildSections(data ?? []), [data]);

  // Jump to today's fixtures once the schedule loads.
  useEffect(() => {
    if (!sections.length) return;
    const todayKey = localDayKey(new Date().toISOString());
    const sectionIndex = sections.findIndex((s) => s.key >= todayKey);
    if (sectionIndex <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: false,
        viewPosition: 0,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [sections]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ThemedText type="title" style={styles.heading}>
        Schedule
      </ThemedText>
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <MatchCard match={item} />
            </View>
          )}
          renderSectionHeader={({ section }: { section: SectionListData<Match, DaySection> }) => (
            <ThemedText type="smallBold" secondary style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          onScrollToIndexFailed={() => {
            // Far-off sections aren't measured yet; an approximate jump is fine.
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Palette.accent}
            />
          }
        />
      )}
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
    paddingBottom: Spacing.two,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
  },
  cardWrap: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  listContent: {
    paddingBottom: Spacing.five,
  },
});
