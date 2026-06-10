/** Domain types — every screen consumes these, never raw ESPN payloads. */

export type MatchStatus = 'pre' | 'in' | 'post';

export interface MatchTeam {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  /** Only meaningful once the match has started. */
  score?: number;
  winner?: boolean;
  /** Recent results string like "WWDLW". */
  form?: string;
}

export interface Match {
  id: string;
  /** Kickoff, ISO 8601. */
  date: string;
  stage: string;
  stageSlug: string;
  status: MatchStatus;
  completed: boolean;
  /** e.g. "Scheduled", "FT", "HT" */
  statusDetail: string;
  /** e.g. "63'" while live */
  displayClock: string;
  venue?: string;
  city?: string;
  broadcasts: string[];
  home: MatchTeam;
  away: MatchTeam;
}

export type MatchEventType =
  | 'goal'
  | 'own-goal'
  | 'missed-penalty'
  | 'yellow-card'
  | 'red-card'
  | 'substitution'
  | 'var'
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'other';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  typeText: string;
  /** e.g. "19'", empty for whistle events */
  minute: string;
  teamId?: string;
  title: string;
  detail?: string;
  isScoringPlay: boolean;
}

export interface MatchDetail {
  match: Match;
  events: MatchEvent[];
  attendance?: number;
  referee?: string;
}

export interface StandingRow {
  rank: number;
  team: {
    id: string;
    name: string;
    abbreviation: string;
    logo?: string;
  };
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalDiff: string;
  points: number;
  /** Advancement note, e.g. { color, description: "Advance to Round of 32" } */
  note?: { color?: string; description?: string };
}

export interface Group {
  name: string;
  rows: StandingRow[];
}
