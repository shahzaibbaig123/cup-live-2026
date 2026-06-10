import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupTable } from '@/components/group-table';
import { EmptyView, ErrorView, LoadingView } from '@/components/status-views';
import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import { useStandings } from '@/hooks/use-football';

export default function GroupsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useStandings();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ThemedText type="title" style={styles.heading}>
        Groups
      </ThemedText>
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(g) => g.name}
          renderItem={({ item }) => <GroupTable group={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Palette.accent}
            />
          }
          ListEmptyComponent={<EmptyView title="Standings not available yet" />}
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
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    flexGrow: 1,
  },
});
