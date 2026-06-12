"""Data loading: historical internationals (martj42) + live WC-2026 (ESPN).

Team names are canonicalized to the history-CSV spelling so ratings can join
across both sources. ESPN ids/logos are carried through for the app output.
"""

from __future__ import annotations

import csv
import os
import time
from dataclasses import dataclass, field

import requests

HISTORY_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
ESPN_V2 = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world"
TOURNAMENT_RANGE = "20260611-20260719"

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")

# ESPN display name -> history-CSV canonical name. Only the divergent ones.
ESPN_TO_CANON = {
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Congo DR": "DR Congo",
    "Czechia": "Czech Republic",
    "Türkiye": "Turkey",
}


def canon(espn_name: str) -> str:
    return ESPN_TO_CANON.get(espn_name, espn_name)


@dataclass(frozen=True)
class HistMatch:
    date: str
    home: str
    away: str
    home_score: int
    away_score: int
    tournament: str
    neutral: bool


@dataclass
class Team:
    name: str          # canonical (CSV) name
    espn_id: str
    espn_name: str
    logo: str | None
    group: str


@dataclass
class Fixture:
    id: str
    date: str
    stage_slug: str
    home: str          # canonical name, or ESPN placeholder for knockouts
    away: str
    home_id: str
    away_id: str
    status: str        # pre | in | post
    home_score: int | None
    away_score: int | None
    played: bool = field(default=False)


def _cache_path(name: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, name)


def _get(url: str, params: dict | None = None) -> dict:
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers={"Accept": "application/json"}, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    return {}


def load_history(max_age_hours: float = 24.0) -> list[HistMatch]:
    """Download (and cache) the full international results CSV."""
    path = _cache_path("results.csv")
    fresh = os.path.exists(path) and (time.time() - os.path.getmtime(path)) < max_age_hours * 3600
    if not fresh:
        r = requests.get(HISTORY_URL, timeout=60)
        r.raise_for_status()
        with open(path, "w", encoding="utf-8") as f:
            f.write(r.text)

    out: list[HistMatch] = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                hs, as_ = int(row["home_score"]), int(row["away_score"])
            except (ValueError, KeyError):
                continue  # unplayed / malformed
            out.append(
                HistMatch(
                    date=row["date"],
                    home=row["home_team"],
                    away=row["away_team"],
                    home_score=hs,
                    away_score=as_,
                    tournament=row.get("tournament", ""),
                    neutral=str(row.get("neutral", "")).strip().upper() == "TRUE",
                )
            )
    out.sort(key=lambda m: m.date)
    return out


def load_teams() -> dict[str, Team]:
    """The 48 WC-2026 teams with their group, keyed by canonical name."""
    data = _get(f"{ESPN_V2}/standings", {"season": 2026})
    teams: dict[str, Team] = {}
    for grp in data.get("children", []):
        group_name = grp.get("name", "")
        for entry in grp.get("standings", {}).get("entries", []):
            t = entry.get("team", {})
            espn_name = t.get("displayName", "")
            name = canon(espn_name)
            teams[name] = Team(
                name=name,
                espn_id=str(t.get("id", "")),
                espn_name=espn_name,
                logo=(t.get("logos") or [{}])[0].get("href"),
                group=group_name,
            )
    return teams


def load_fixtures() -> list[Fixture]:
    """All 104 tournament fixtures (group-stage have real teams; knockouts are
    placeholders we replace via simulation)."""
    data = _get(f"{ESPN}/scoreboard", {"dates": TOURNAMENT_RANGE, "limit": 200})
    fixtures: list[Fixture] = []
    for ev in data.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        competitors = comp.get("competitors", [])
        home = next((c for c in competitors if c.get("homeAway") == "home"), None)
        away = next((c for c in competitors if c.get("homeAway") == "away"), None)
        if not home or not away:
            continue
        status = comp.get("status", {}).get("type", {})
        state = status.get("state", "pre")

        def score(c):
            try:
                return int(c.get("score"))
            except (TypeError, ValueError):
                return None

        fixtures.append(
            Fixture(
                id=str(ev.get("id", "")),
                date=comp.get("date", ev.get("date", "")),
                stage_slug=ev.get("season", {}).get("slug", ""),
                home=canon(home.get("team", {}).get("displayName", "")),
                away=canon(away.get("team", {}).get("displayName", "")),
                home_id=str(home.get("team", {}).get("id", "")),
                away_id=str(away.get("team", {}).get("id", "")),
                status="in" if state == "in" else "post" if state == "post" else "pre",
                home_score=score(home),
                away_score=score(away),
                played=status.get("completed", False),
            )
        )
    fixtures.sort(key=lambda f: f.date)
    return fixtures


if __name__ == "__main__":
    hist = load_history()
    teams = load_teams()
    fixtures = load_fixtures()
    print(f"history matches: {len(hist):,} ({hist[0].date} … {hist[-1].date})")
    print(f"WC-2026 teams:   {len(teams)}")
    print(f"WC-2026 fixtures:{len(fixtures)} | played: {sum(f.played for f in fixtures)}")
    missing = [n for n in teams if not any(h.home == n or h.away == n for h in hist[-2000:])]
    print(f"teams with no recent history match (alias check): {missing}")
    groups = sorted({t.group for t in teams.values()})
    print(f"groups: {groups}")
