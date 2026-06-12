import { useQuery } from '@tanstack/react-query';

import { getMatchDetail, getSchedule, getStandings } from '@/api/espn';
import { getPredictions } from '@/api/predictions';
import type { Match } from '@/api/types';

const LIVE_POLL_MS = 30_000;
const LIVE_DETAIL_POLL_MS = 15_000;
const IDLE_POLL_MS = 5 * 60_000;

const hasLiveMatch = (matches?: Match[]) => matches?.some((m) => m.status === 'in') ?? false;

/**
 * All 104 matches in one cached query, shared by the Matches and Schedule tabs.
 * We fetch the whole tournament and bucket by the device's local day on the
 * client, so day boundaries follow the user's timezone — not ESPN's US-Eastern
 * scoreboard bucketing. Polls every 30s while any match is live.
 */
export function useAllMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: getSchedule,
    staleTime: 15_000,
    refetchInterval: (query) =>
      hasLiveMatch(query.state.data) ? LIVE_POLL_MS : IDLE_POLL_MS,
  });
}

export function useStandings() {
  return useQuery({
    queryKey: ['standings'],
    queryFn: getStandings,
    staleTime: 60_000,
    refetchInterval: IDLE_POLL_MS,
  });
}

/** AI predictions artifact, refreshed by the offline pipeline a few times a day. */
export function usePredictions() {
  return useQuery({
    queryKey: ['predictions'],
    queryFn: getPredictions,
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  });
}

export function useMatchDetail(eventId: string) {
  return useQuery({
    queryKey: ['match', eventId],
    queryFn: () => getMatchDetail(eventId),
    enabled: !!eventId,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.match.status;
      if (status === 'in') return LIVE_DETAIL_POLL_MS;
      if (status === 'pre') return 60_000;
      return false;
    },
  });
}
