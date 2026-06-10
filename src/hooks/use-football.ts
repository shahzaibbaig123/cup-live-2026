import { useQuery } from '@tanstack/react-query';

import { getMatchDetail, getSchedule, getScoreboard, getStandings } from '@/api/espn';
import type { Match } from '@/api/types';

const LIVE_POLL_MS = 30_000;
const LIVE_DETAIL_POLL_MS = 15_000;
const IDLE_POLL_MS = 5 * 60_000;

const hasLiveMatch = (matches?: Match[]) => matches?.some((m) => m.status === 'in') ?? false;

export function useMatchesForDate(dateParam: string) {
  return useQuery({
    queryKey: ['matches', dateParam],
    queryFn: () => getScoreboard(dateParam),
    staleTime: 15_000,
    refetchInterval: (query) =>
      hasLiveMatch(query.state.data) ? LIVE_POLL_MS : IDLE_POLL_MS,
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: getSchedule,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
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
