/**
 * Adapter for the prediction artifact produced by the offline `predictor/`
 * pipeline and published to GitHub Pages. Defensive parsing like espn.ts —
 * a schema change degrades gracefully rather than crashing the app.
 *
 * Served with `access-control-allow-origin: *`, so the absolute URL works from
 * native, production web, and local dev alike.
 */

const PREDICTIONS_URL = 'https://shahzaibbaig123.github.io/cup-live-2026/predictions.json';

export type Outcome = 'home' | 'draw' | 'away';

export interface MatchForecast {
  id: string;
  home: string;
  away: string;
  homeId: string;
  awayId: string;
  stage: string;
  date: string;
  status: 'pre' | 'in' | 'post';
  pHome: number;
  pDraw: number;
  pAway: number;
  predicted: Outcome;
  xHome: number;
  xAway: number;
  result?: Outcome;
  score?: string;
}

export interface TitleOdds {
  teamId: string;
  name: string;
  logo?: string;
  group: string;
  elo: number;
  form: number;
  winCup: number;
  reachFinal: number;
  reachR16: number;
  qualify: number;
  winGroup: number;
}

export interface AccuracyEntry {
  date: string;
  matchId: string;
  home: string;
  away: string;
  predicted: Outcome;
  actual: Outcome;
  correct: boolean;
  rps: number;
}

export interface Accuracy {
  n: number;
  hitRate: number | null;
  rps: number | null;
  brier: number | null;
  history: AccuracyEntry[];
}

export interface Predictions {
  generatedAt: string;
  timesfmUsed: boolean;
  nSims: number;
  matches: Record<string, MatchForecast>;
  titleOdds: TitleOdds[];
  accuracy: Accuracy;
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function parseMatch(id: string, raw: any): MatchForecast {
  return {
    id,
    home: raw?.home ?? '',
    away: raw?.away ?? '',
    homeId: String(raw?.homeId ?? ''),
    awayId: String(raw?.awayId ?? ''),
    stage: raw?.stage ?? '',
    date: raw?.date ?? '',
    status: raw?.status === 'in' ? 'in' : raw?.status === 'post' ? 'post' : 'pre',
    pHome: num(raw?.pHome),
    pDraw: num(raw?.pDraw),
    pAway: num(raw?.pAway),
    predicted: raw?.predicted === 'draw' ? 'draw' : raw?.predicted === 'away' ? 'away' : 'home',
    xHome: num(raw?.xHome),
    xAway: num(raw?.xAway),
    result: raw?.result,
    score: raw?.score,
  };
}

function parseTitleOdds(raw: any): TitleOdds {
  return {
    teamId: String(raw?.teamId ?? ''),
    name: raw?.name ?? '',
    logo: raw?.logo,
    group: raw?.group ?? '',
    elo: num(raw?.elo),
    form: num(raw?.form, 1),
    winCup: num(raw?.winCup),
    reachFinal: num(raw?.reachFinal),
    reachR16: num(raw?.reachR16),
    qualify: num(raw?.qualify),
    winGroup: num(raw?.winGroup),
  };
}

export async function getPredictions(): Promise<Predictions> {
  const res = await fetch(PREDICTIONS_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Predictions request failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  const matches: Record<string, MatchForecast> = {};
  for (const [id, raw] of Object.entries(data?.matches ?? {})) {
    matches[id] = parseMatch(id, raw);
  }
  const acc = data?.accuracy ?? {};
  return {
    generatedAt: data?.generatedAt ?? '',
    timesfmUsed: data?.meta?.timesfmUsed === true,
    nSims: num(data?.meta?.nSims),
    matches,
    titleOdds: (data?.titleOdds ?? []).map(parseTitleOdds),
    accuracy: {
      n: num(acc?.n),
      hitRate: acc?.hitRate ?? null,
      rps: acc?.rps ?? null,
      brier: acc?.brier ?? null,
      history: (acc?.history ?? []) as AccuracyEntry[],
    },
  };
}
