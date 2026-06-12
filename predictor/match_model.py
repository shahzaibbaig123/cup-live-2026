"""Dixon-Coles bivariate Poisson match model.

A rating gap (Elo, optionally nudged by TimesFM form) is mapped to a goal
supremacy and a total-goals expectation, both calibrated from recent history.
That gives two Poisson means, refined by the Dixon-Coles low-score correction,
yielding win/draw/loss probabilities and a scoreline distribution.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .ratings import Calibration

MAX_GOALS = 10
MIN_LAMBDA = 0.15


@dataclass
class ModelParams:
    beta: float        # goal supremacy per Elo point
    total_goals: float # baseline expected goals in a match
    rho: float         # Dixon-Coles low-score dependence


def calibrate(calib: Calibration) -> ModelParams:
    samples = calib.samples
    elo = np.array([s[0] for s in samples], dtype=float)
    gd = np.array([s[1] for s in samples], dtype=float)
    total = np.array([s[2] for s in samples], dtype=float)

    # goal_diff ≈ beta * elo_diff  (least squares through the origin)
    beta = float((elo @ gd) / (elo @ elo))
    total_goals = float(total.mean())

    # Pick rho to match the empirical draw rate at the mean scoreline.
    target_draw = float((gd == 0).mean())
    base = total_goals / 2.0
    best_rho, best_err = 0.0, 1e9
    # Range spans both signs: classic Dixon-Coles uses rho<0 to lift low-score
    # draws, but international scoring needs rho>0 to trim them. Keep the optimum
    # comfortably inside the grid so calibration never pins to a boundary.
    for rho in np.linspace(-0.25, 0.25, 51):
        p = score_matrix(base, base, rho)
        draw = float(np.trace(p))
        err = abs(draw - target_draw)
        if err < best_err:
            best_rho, best_err = float(rho), err
    return ModelParams(beta=beta, total_goals=total_goals, rho=best_rho)


def _dc_tau(matrix: np.ndarray, lam: float, mu: float, rho: float) -> np.ndarray:
    """Apply the Dixon-Coles correction to the four low-score cells."""
    m = matrix.copy()
    m[0, 0] *= 1.0 - lam * mu * rho
    m[0, 1] *= 1.0 + lam * rho
    m[1, 0] *= 1.0 + mu * rho
    m[1, 1] *= 1.0 - rho
    return m


def _poisson_pmf(lam: float, kmax: int) -> np.ndarray:
    k = np.arange(kmax + 1)
    # exp(-lam) * lam^k / k!
    logp = -lam + k * math.log(lam) - np.array([math.lgamma(i + 1) for i in k])
    return np.exp(logp)


def score_matrix(lam_home: float, lam_away: float, rho: float) -> np.ndarray:
    home = _poisson_pmf(lam_home, MAX_GOALS)
    away = _poisson_pmf(lam_away, MAX_GOALS)
    matrix = np.outer(home, away)
    matrix = _dc_tau(matrix, lam_home, lam_away, rho)
    matrix /= matrix.sum()
    return matrix


def expected_goals(
    rating_home: float,
    rating_away: float,
    params: ModelParams,
    *,
    neutral: bool = True,
    home_edge: float = 0.0,
    form_home: float = 1.0,
    form_away: float = 1.0,
) -> tuple[float, float]:
    edge = home_edge if not neutral else 0.0
    elo_diff = (rating_home + edge) - rating_away
    supremacy = params.beta * elo_diff
    lam_home = max(MIN_LAMBDA, (params.total_goals + supremacy) / 2.0) * form_home
    lam_away = max(MIN_LAMBDA, (params.total_goals - supremacy) / 2.0) * form_away
    return lam_home, lam_away


@dataclass
class MatchPrediction:
    p_home: float
    p_draw: float
    p_away: float
    lam_home: float
    lam_away: float
    exp_home: int
    exp_away: int


def predict_match(
    rating_home: float,
    rating_away: float,
    params: ModelParams,
    *,
    neutral: bool = True,
    home_edge: float = 0.0,
    form_home: float = 1.0,
    form_away: float = 1.0,
) -> MatchPrediction:
    lam_h, lam_a = expected_goals(
        rating_home, rating_away, params,
        neutral=neutral, home_edge=home_edge, form_home=form_home, form_away=form_away,
    )
    matrix = score_matrix(lam_h, lam_a, params.rho)
    p_home = float(np.tril(matrix, -1).sum())
    p_draw = float(np.trace(matrix))
    p_away = float(np.triu(matrix, 1).sum())
    idx = np.unravel_index(int(np.argmax(matrix)), matrix.shape)
    return MatchPrediction(
        p_home=p_home, p_draw=p_draw, p_away=p_away,
        lam_home=lam_h, lam_away=lam_a,
        exp_home=int(idx[0]), exp_away=int(idx[1]),
    )


if __name__ == "__main__":
    from .data import load_history, load_teams
    from .ratings import compute_elo

    history = load_history()
    ratings, calib = compute_elo(history)
    params = calibrate(calib)
    print(f"calibrated: beta={params.beta:.5f}/Elo  total_goals={params.total_goals:.2f}  rho={params.rho:.3f}")
    teams = load_teams()
    r = lambda n: ratings[n]
    for a, b in [("Spain", "Qatar"), ("Argentina", "Brazil"), ("Germany", "Japan"), ("France", "United States")]:
        p = predict_match(r(a), r(b), params)
        print(f"  {a} vs {b}: {p.p_home:.0%}/{p.p_draw:.0%}/{p.p_away:.0%}  "
              f"xg {p.lam_home:.2f}-{p.lam_away:.2f}  likely {p.exp_home}-{p.exp_away}")
