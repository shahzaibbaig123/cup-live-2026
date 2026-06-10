# Cup Live 2026 ⚽️

A mobile app for live FIFA World Cup 2026 updates — live scores with goal/card/substitution
events, the full 104-match schedule, and all 12 group tables. Built with Expo / React Native.

> Not affiliated with FIFA. Match data comes from ESPN's public API.

## Run it

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone (or press `i` / `a` for a
simulator).

## What's inside

| Tab | What it shows |
|---|---|
| **Matches** | Day-by-day match cards with live score and clock, auto-refreshing every 30s while games are live. Tap a card for details. |
| **Schedule** | All 104 matches grouped by day (June 11 – July 19), auto-scrolled to today. |
| **Groups** | The 12 group tables with advancement highlighting. |

The match detail screen shows a live events timeline (goals, cards, substitutions, VAR),
venue, referee, attendance, and TV broadcasters, polling every 15s during live play.

## Architecture

- **Expo SDK 56** + TypeScript + **expo-router** (file routes in `src/app/`)
- **@tanstack/react-query** for fetching/caching/polling — intervals adapt to match state
- All ESPN parsing is isolated in [src/api/espn.ts](src/api/espn.ts) behind domain types in
  [src/api/types.ts](src/api/types.ts), so the data source can be swapped (e.g. for
  football-data.org) without touching screens
- Dark-only theme in [src/constants/theme.ts](src/constants/theme.ts)

### Data endpoints (ESPN public API, no key)

- Scoreboard: `site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD`
- Match summary: `.../summary?event={id}`
- Standings: `site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026`

## Icons

App icons are generated from an inline SVG — edit and re-run:

```bash
node scripts/generate-icons.mjs
```

## Store release

Builds go through [EAS](https://docs.expo.dev/build/introduction/): `npx eas build`.
Requires an Apple Developer account ($99/yr) and a Google Play developer account ($25
one-time). Keep FIFA trademarks out of the store name/branding.
