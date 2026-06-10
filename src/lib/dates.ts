/** Tournament calendar helpers. All display formatting is in the device's locale/timezone. */

export const TOURNAMENT_START = new Date(2026, 5, 11);
export const TOURNAMENT_END = new Date(2026, 6, 19);

/** Format a Date as the YYYYMMDD string the scoreboard API expects. */
export function toDateParam(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${m}${day}`;
}

export function tournamentDays(): Date[] {
  const days: Date[] = [];
  for (let d = new Date(TOURNAMENT_START); d <= TOURNAMENT_END; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

export function clampToTournament(d: Date): Date {
  if (d < TOURNAMENT_START) return new Date(TOURNAMENT_START);
  if (d > TOURNAMENT_END) return new Date(TOURNAMENT_END);
  return d;
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayHeaderFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const fullDateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatKickoffTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatKickoffDateTime(iso: string): string {
  return fullDateTimeFormat.format(new Date(iso));
}

export function formatWeekday(d: Date): string {
  return weekdayFormat.format(d);
}

export function formatDayHeader(d: Date): string {
  return dayHeaderFormat.format(d);
}

/** Local-timezone day key for grouping matches, e.g. "2026-06-11". */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
