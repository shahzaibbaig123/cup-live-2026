"""Monte Carlo tournament simulation under the WC-2026 format.

12 groups of 4 → top 2 of each group (24) + 8 best third-placed = 32 → a
single-elimination knockout (R32 → Final). Already-played group results are
fixed; everything else is sampled from the match model many times to produce
per-team title / final / R16 / group-winner probabilities.

Vectorized with numpy: a 48×48 knockout advance-probability matrix and the
per-fixture score distributions are precomputed once, then all simulations are
sampled together.

Modeling note: FIFA's exact R32 slotting (the third-place assignment table) is
approximated by strength-seeded standard bracketing. Headline title/round odds
are robust to this; the specific R32 opponent may differ from the official draw.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .data import Fixture, Team
from .match_model import MAX_GOALS, ModelParams, predict_match, score_matrix


def _standard_bracket(n: int) -> list[int]:
    """Seed order for a single-elim bracket so seed 1 & 2 meet only in the final."""
    order = [1]
    while len(order) < n:
        size = len(order) * 2
        nxt: list[int] = []
        for s in order:
            nxt.append(s)
            nxt.append(size + 1 - s)
        order = nxt
    return order  # 1-indexed seeds, length n


@dataclass
class SimResult:
    teams: list[str]
    title: dict[str, float]
    final: dict[str, float]
    r16: dict[str, float]
    qualify: dict[str, float]      # reach the knockouts (R32)
    win_group: dict[str, float]
    n_sims: int


def _advance_matrix(idx: dict[str, int], ratings, form, params: ModelParams) -> np.ndarray:
    """P_adv[i, j] = probability team i eliminates team j in a knockout (neutral)."""
    n = len(idx)
    p_adv = np.full((n, n), 0.5)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            pr = predict_match(
                ratings[i], ratings[j], params,
                neutral=True, form_home=form[i], form_away=form[j],
            )
            denom = pr.p_home + pr.p_away
            extra = pr.p_draw * (pr.p_home / denom if denom > 0 else 0.5)
            p_adv[i, j] = pr.p_home + extra
    return p_adv


def _sample_group_goals(
    fixtures: list[Fixture], idx: dict[str, int], ratings, form,
    params: ModelParams, n: int, rng: np.random.Generator,
):
    """For each group fixture return sampled (home_goals, away_goals) arrays, shape (n,)."""
    cells = MAX_GOALS + 1
    out = []
    for fx in fixtures:
        hi, ai = idx[fx.home], idx[fx.away]
        if fx.played and fx.home_score is not None and fx.away_score is not None:
            hg = np.full(n, fx.home_score, dtype=np.int16)
            ag = np.full(n, fx.away_score, dtype=np.int16)
        else:
            pr = predict_match(ratings[hi], ratings[ai], params,
                               neutral=True, form_home=form[hi], form_away=form[ai])
            matrix = score_matrix(pr.lam_home, pr.lam_away, params.rho).ravel()
            picks = rng.choice(cells * cells, size=n, p=matrix)
            hg = (picks // cells).astype(np.int16)
            ag = (picks % cells).astype(np.int16)
        out.append((hi, ai, hg, ag))
    return out


def _composite(pts, gd, gf):
    """Single sortable key encoding the standard tiebreakers: pts > GD > GF."""
    return pts.astype(np.int64) * 1_000_000 + (gd + 100) * 1_000 + gf


def run(
    teams: dict[str, Team],
    ratings_by_name: dict[str, float],
    form_by_name: dict[str, float],
    params: ModelParams,
    fixtures: list[Fixture],
    n_sims: int = 20_000,
    seed: int = 7,
) -> SimResult:
    rng = np.random.default_rng(seed)
    names = list(teams)
    idx = {n: i for i, n in enumerate(names)}
    ratings = np.array([ratings_by_name[n] for n in names])
    form = np.array([form_by_name.get(n, 1.0) for n in names])

    groups: dict[str, list[int]] = {}
    for name, t in teams.items():
        groups.setdefault(t.group, []).append(idx[name])
    group_letters = sorted(groups)

    fx_by_group: dict[str, list[Fixture]] = {g: [] for g in group_letters}
    for f in fixtures:
        if f.stage_slug == "group-stage" and f.home in idx and f.away in idx:
            fx_by_group[teams[f.home].group].append(f)

    p_adv = _advance_matrix(idx, ratings, form, params)

    n = n_sims
    win_group = np.zeros(len(names))
    qualify = np.zeros(len(names))
    reach_r16 = np.zeros(len(names))
    reach_final = np.zeros(len(names))
    champion = np.zeros(len(names))

    # Per-group: produce winner / runner / third global indices + third composite.
    winners = np.zeros((12, n), dtype=np.int32)
    runners = np.zeros((12, n), dtype=np.int32)
    thirds = np.zeros((12, n), dtype=np.int32)
    thirds_key = np.zeros((12, n), dtype=np.int64)

    for gi, g in enumerate(group_letters):
        members = groups[g]
        local = {t: k for k, t in enumerate(members)}
        pts = np.zeros((4, n), dtype=np.int32)
        gf = np.zeros((4, n), dtype=np.int32)
        ga = np.zeros((4, n), dtype=np.int32)
        for hi, ai, hg, ag in _sample_group_goals(fx_by_group[g], idx, ratings, form, params, n, rng):
            a, b = local[hi], local[ai]
            home_win = hg > ag
            draw = hg == ag
            pts[a] += np.where(home_win, 3, np.where(draw, 1, 0))
            pts[b] += np.where(hg < ag, 3, np.where(draw, 1, 0))
            gf[a] += hg; ga[a] += ag
            gf[b] += ag; ga[b] += hg
        gd = gf - ga
        key = _composite(pts, gd, gf)              # shape (4, n)
        order = np.argsort(-key, axis=0)           # best→worst local team per sim
        member_arr = np.array(members)
        win_local, run_local, third_local = order[0], order[1], order[2]
        winners[gi] = member_arr[win_local]
        runners[gi] = member_arr[run_local]
        thirds[gi] = member_arr[third_local]
        thirds_key[gi] = np.take_along_axis(key, third_local[None, :], axis=0)[0]
        np.add.at(win_group, winners[gi], 1)

    # Best 8 of the 12 third-placed teams per sim.
    third_order = np.argsort(-thirds_key, axis=0)  # (12, n)
    best8 = third_order[:8]                          # (8, n) group-rows that qualify
    qualifying_thirds = np.take_along_axis(thirds, best8, axis=0)  # (8, n) global idx

    # 32 qualifiers per sim: 12 winners, 12 runners, 8 thirds.
    qualifiers = np.concatenate([winners, runners, qualifying_thirds], axis=0)  # (32, n)
    np.add.at(qualify, qualifiers.ravel(), 1)

    # Seed the 32 by tier then Elo (winners best, then runners, then thirds).
    tier = np.concatenate([
        np.zeros((12, n)), np.full((12, n), 1.0), np.full((8, n), 2.0),
    ], axis=0)
    seed_key = tier * 100_000 - ratings[qualifiers]   # smaller = better seed
    seed_rank = np.argsort(seed_key, axis=0)          # (32, n): position s = s-th best seed
    seeded = np.take_along_axis(qualifiers, seed_rank, axis=0)  # (32, n) by seed 1..32

    # Place seeds into standard bracket positions.
    bracket = np.array(_standard_bracket(32)) - 1     # seed index per position
    alive = seeded[bracket]                            # (32, n) global idx by bracket position

    # Knockout rounds.
    reach_targets = {16: reach_r16, 2: reach_final}
    cur = alive
    while cur.shape[0] > 1:
        size = cur.shape[0]
        if size in reach_targets:
            np.add.at(reach_targets[size], cur.ravel(), 1)
        pair = cur.reshape(size // 2, 2, n)
        home_idx, away_idx = pair[:, 0, :], pair[:, 1, :]
        p = p_adv[home_idx, away_idx]                 # (size/2, n)
        home_adv = rng.random((size // 2, n)) < p
        cur = np.where(home_adv, home_idx, away_idx)  # (size/2, n)
    np.add.at(champion, cur.ravel(), 1)

    to_prob = lambda arr: {names[i]: float(arr[i] / n) for i in range(len(names))}
    return SimResult(
        teams=names,
        title=to_prob(champion),
        final=to_prob(reach_final),
        r16=to_prob(reach_r16),
        qualify=to_prob(qualify),
        win_group=to_prob(win_group),
        n_sims=n,
    )


if __name__ == "__main__":
    from .data import load_fixtures, load_history, load_teams
    from .match_model import calibrate
    from .ratings import compute_elo

    history = load_history()
    teams = load_teams()
    fixtures = load_fixtures()
    ratings, calib = compute_elo(history)
    params = calibrate(calib)
    form = {n: 1.0 for n in teams}

    res = run(teams, ratings, form, params, fixtures, n_sims=20_000)
    ranked = sorted(res.title.items(), key=lambda x: x[1], reverse=True)
    print(f"Title odds (n={res.n_sims:,}):")
    for name, p in ranked[:14]:
        print(f"  {name:24} win {p:5.1%}  final {res.final[name]:5.1%}  "
              f"R16 {res.r16[name]:5.1%}  grpW {res.win_group[name]:5.1%}")
    print(f"\nsum title probs = {sum(res.title.values()):.3f} (≈1.0)")
