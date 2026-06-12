"""International Elo ratings (World Football Elo conventions).

Processes the full match history chronologically. Besides final ratings, it
emits calibration samples — (elo_diff, goal_diff, total_goals) for recent
matches — used by match_model.py to map a rating gap to expected goals.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .data import HistMatch

START_RATING = 1500.0
HOME_ADV = 65.0  # Elo points added to the home side when not on neutral ground

# Tournament importance -> K factor. Substring match, case-insensitive.
_K_RULES = [
    ("fifa world cup qual", 40),
    ("fifa world cup", 60),
    ("uefa euro qual", 40),
    ("uefa euro", 50),
    ("copa américa", 50),
    ("copa america", 50),
    ("african cup of nations", 50),
    ("afc asian cup", 50),
    ("uefa nations league", 45),
    ("confederations cup", 45),
    ("qualification", 40),
    ("friendly", 15),
]
_K_DEFAULT = 30


def _k_factor(tournament: str) -> int:
    t = tournament.lower()
    for needle, k in _K_RULES:
        if needle in t:
            return k
    return _K_DEFAULT


def _mov_multiplier(goal_diff: int) -> float:
    """Margin-of-victory multiplier (World Football Elo)."""
    g = abs(goal_diff)
    if g <= 1:
        return 1.0
    if g == 2:
        return 1.5
    return (11 + g) / 8.0


@dataclass
class Calibration:
    samples: list[tuple[float, int, int]]  # (elo_diff_with_home, goal_diff, total)


def compute_elo(
    history: list[HistMatch],
    sample_since: str = "2018-01-01",
) -> tuple[dict[str, float], Calibration]:
    ratings: dict[str, float] = {}
    samples: list[tuple[float, int, int]] = []

    def rating(team: str) -> float:
        return ratings.setdefault(team, START_RATING)

    for m in history:
        rh, ra = rating(m.home), rating(m.away)
        home_edge = 0.0 if m.neutral else HOME_ADV
        elo_diff = (rh + home_edge) - ra  # positive => home favored

        expected_home = 1.0 / (1.0 + 10 ** (-elo_diff / 400.0))
        goal_diff = m.home_score - m.away_score
        score_home = 1.0 if goal_diff > 0 else 0.5 if goal_diff == 0 else 0.0

        k = _k_factor(m.tournament) * _mov_multiplier(goal_diff)
        delta = k * (score_home - expected_home)
        ratings[m.home] = rh + delta
        ratings[m.away] = ra - delta

        if m.date >= sample_since:
            samples.append((elo_diff, goal_diff, m.home_score + m.away_score))

    return ratings, Calibration(samples=samples)


if __name__ == "__main__":
    from .data import load_history, load_teams

    ratings, calib = compute_elo(load_history())
    teams = load_teams()
    ranked = sorted(
        ((n, ratings.get(n, START_RATING)) for n in teams),
        key=lambda x: x[1],
        reverse=True,
    )
    print(f"calibration samples: {len(calib.samples):,}")
    print("\nTop 12 WC-2026 teams by Elo:")
    for i, (name, r) in enumerate(ranked[:12], 1):
        print(f"  {i:2}. {name:24} {r:7.1f}")
    print("\nBottom 5:")
    for name, r in ranked[-5:]:
        print(f"      {name:24} {r:7.1f}")
