/**
 * Adapter for ESPN's public soccer API (unofficial, no key required).
 * All parsing is defensive: fields are optional-chained and given fallbacks
 * so a payload change degrades the UI instead of crashing it. If ESPN ever
 * breaks, only this file needs to change (e.g. swap in football-data.org).
 */

import type {
  Group,
  Match,
  MatchDetail,
  MatchEvent,
  MatchEventType,
  MatchStatus,
  MatchTeam,
  StandingRow,
} from './types';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const SITE_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world';

/** Full tournament window in the YYYYMMDD-YYYYMMDD form the scoreboard accepts. */
const TOURNAMENT_RANGE = '20260611-20260719';

const STAGE_LABELS: Record<string, string> = {
  'group-stage': 'Group Stage',
  'round-of-32': 'Round of 32',
  'round-of-16': 'Round of 16',
  quarterfinals: 'Quarterfinal',
  semifinals: 'Semifinal',
  '3rd-place-match': 'Third Place',
  final: 'Final',
};

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Live data request failed (HTTP ${res.status})`);
  }
  return res.json();
}

function parseTeam(competitor: any, status: MatchStatus): MatchTeam {
  const team = competitor?.team ?? {};
  const rawScore = competitor?.score;
  const score = Number(typeof rawScore === 'object' ? rawScore?.displayValue : rawScore);
  return {
    id: String(team.id ?? ''),
    name: team.displayName ?? 'TBD',
    shortName: team.shortDisplayName ?? team.displayName ?? 'TBD',
    abbreviation: team.abbreviation ?? '',
    logo: team.logo ?? team.logos?.[0]?.href,
    score: status !== 'pre' && Number.isFinite(score) ? score : undefined,
    winner: competitor?.winner === true,
    form: competitor?.form,
  };
}

function parseMatch(event: any): Match {
  const comp = event?.competitions?.[0] ?? {};
  const competitors: any[] = comp.competitors ?? [];
  const home = competitors.find((c) => c?.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c?.homeAway === 'away') ?? competitors[1];
  const status = comp.status ?? event?.status ?? {};
  const state: MatchStatus =
    status.type?.state === 'in' ? 'in' : status.type?.state === 'post' ? 'post' : 'pre';
  const stageSlug = event?.season?.slug ?? '';
  const venue = comp.venue ?? event?.venue;

  return {
    id: String(event?.id ?? comp.id ?? ''),
    date: comp.date ?? event?.date ?? '',
    stage: STAGE_LABELS[stageSlug] ?? stageSlug,
    stageSlug,
    status: state,
    completed: status.type?.completed === true,
    statusDetail: status.type?.shortDetail ?? status.type?.description ?? '',
    displayClock: status.displayClock ?? '',
    venue: venue?.fullName,
    city: venue?.address?.city,
    broadcasts: (comp.broadcasts ?? []).flatMap((b: any) => b?.names ?? []),
    home: parseTeam(home, state),
    away: parseTeam(away, state),
  };
}

function eventType(raw: any): MatchEventType {
  const slug: string = raw?.type?.type ?? '';
  if (slug.includes('own-goal')) return 'own-goal';
  if (raw?.scoringPlay === true) return 'goal';
  if (slug.includes('yellow')) return 'yellow-card';
  if (slug.includes('red')) return 'red-card';
  if (slug.includes('substitution')) return 'substitution';
  if (slug.includes('penalty') && slug.includes('miss')) return 'missed-penalty';
  if (slug.includes('video') || slug.includes('var')) return 'var';
  if (slug.includes('kickoff')) return 'kickoff';
  if (slug.includes('halftime') || slug.includes('half-time')) return 'halftime';
  if (slug.includes('full-time') || slug.includes('end-regular')) return 'fulltime';
  return 'other';
}

function parseEvent(raw: any, index: number): MatchEvent {
  const players: string[] = (raw?.participants ?? [])
    .map((p: any) => p?.athlete?.displayName)
    .filter(Boolean);
  const typeText = raw?.type?.text ?? '';
  return {
    id: String(raw?.id ?? index),
    type: eventType(raw),
    typeText,
    minute: raw?.clock?.displayValue ?? '',
    teamId: raw?.team?.id ? String(raw.team.id) : undefined,
    title: raw?.shortText ?? (players.length ? `${players[0]} ${typeText}` : typeText),
    detail: raw?.text ?? undefined,
    isScoringPlay: raw?.scoringPlay === true,
  };
}

export async function getScoreboard(dates: string): Promise<Match[]> {
  const data = await fetchJson(`${SITE}/scoreboard?dates=${dates}&limit=200`);
  return (data?.events ?? []).map(parseMatch);
}

export async function getSchedule(): Promise<Match[]> {
  const matches = await getScoreboard(TOURNAMENT_RANGE);
  return matches.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMatchDetail(eventId: string): Promise<MatchDetail> {
  const data = await fetchJson(`${SITE}/summary?event=${eventId}`);
  const header = data?.header ?? {};
  const match = parseMatch({
    id: header.id,
    season: header.season,
    competitions: header.competitions,
  });

  const venue = data?.gameInfo?.venue;
  if (venue?.fullName) {
    match.venue = venue.fullName;
    match.city = venue.address?.city;
  }

  const events: MatchEvent[] = (data?.keyEvents ?? []).map(parseEvent);
  const attendance = data?.gameInfo?.attendance;
  const official = data?.gameInfo?.officials?.[0];

  return {
    match,
    events,
    attendance: typeof attendance === 'number' && attendance > 0 ? attendance : undefined,
    referee: official?.displayName ?? official?.fullName,
  };
}

function parseStandingRow(entry: any, index: number): StandingRow {
  const stats: any[] = entry?.stats ?? [];
  const stat = (name: string) => stats.find((s) => s?.name === name);
  const num = (name: string) => {
    const value = Number(stat(name)?.value);
    return Number.isFinite(value) ? value : 0;
  };
  const team = entry?.team ?? {};
  return {
    rank: num('rank') || index + 1,
    team: {
      id: String(team.id ?? ''),
      name: team.shortDisplayName ?? team.displayName ?? 'TBD',
      abbreviation: team.abbreviation ?? '',
      logo: team.logos?.[0]?.href,
    },
    played: num('gamesPlayed'),
    wins: num('wins'),
    draws: num('ties'),
    losses: num('losses'),
    goalDiff: stat('pointDifferential')?.displayValue ?? '0',
    points: num('points'),
    note: entry?.note
      ? { color: entry.note.color, description: entry.note.description }
      : undefined,
  };
}

export async function getStandings(): Promise<Group[]> {
  const data = await fetchJson(`${SITE_V2}/standings?season=2026`);
  return (data?.children ?? []).map((child: any) => ({
    name: child?.name ?? '',
    rows: (child?.standings?.entries ?? []).map(parseStandingRow),
  }));
}
