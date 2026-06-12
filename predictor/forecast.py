"""TimesFM form feature (optional, bounded).

For each team we build a short series of recent per-match goal difference and
ask TimesFM to forecast the next value. A team trending above its own recent
baseline gets a small scoring boost; one trending down gets a small penalty.
The effect is deliberately clamped so TimesFM *nudges* the Elo+Poisson engine
rather than driving it.

TimesFM (PyTorch) is heavy and only available in CI (Python 3.11). If it can't
be imported or loaded, every team gets a neutral form of 1.0 and the rest of
the pipeline is unaffected.
"""

from __future__ import annotations

import sys

import numpy as np

from .data import HistMatch

LOOKBACK = 24          # recent matches per team fed to the forecaster
MIN_SERIES = 8         # need at least this many to forecast
FORM_CLAMP = (0.88, 1.12)
FORM_GAIN = 0.06       # how strongly a 1-goal trend shift moves the multiplier
CHECKPOINT = "google/timesfm-2.5-200m-pytorch"


def build_series(history: list[HistMatch], teams: list[str]) -> dict[str, np.ndarray]:
    """Recent per-match goal difference (team's perspective), oldest→newest."""
    series: dict[str, list[float]] = {t: [] for t in teams}
    wanted = set(teams)
    for m in history:
        if m.home in wanted:
            series[m.home].append(float(m.home_score - m.away_score))
        if m.away in wanted:
            series[m.away].append(float(m.away_score - m.home_score))
    return {t: np.array(v[-LOOKBACK:], dtype=float) for t, v in series.items()}


def _neutral(teams: list[str]) -> dict[str, float]:
    return {t: 1.0 for t in teams}


def _load_model():
    """Return a compiled TimesFM model, or None if unavailable."""
    try:
        import timesfm  # type: ignore
    except Exception as exc:  # noqa: BLE001
        print(f"[forecast] TimesFM not installed ({exc}); using neutral form.", file=sys.stderr)
        return None
    try:
        model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(CHECKPOINT)
        model.compile(timesfm.ForecastConfig(max_context=64, max_horizon=4))
        return model
    except Exception as exc:  # noqa: BLE001
        print(f"[forecast] TimesFM load failed ({exc}); using neutral form.", file=sys.stderr)
        return None


def compute_form(history: list[HistMatch], teams: list[str]) -> dict[str, float]:
    series = build_series(history, teams)
    model = _load_model()
    if model is None:
        return _neutral(teams)

    names = [t for t in teams if len(series[t]) >= MIN_SERIES]
    inputs = [series[t] for t in names]
    try:
        point_forecast, _ = model.forecast(horizon=1, inputs=inputs)
    except Exception as exc:  # noqa: BLE001
        print(f"[forecast] TimesFM inference failed ({exc}); using neutral form.", file=sys.stderr)
        return _neutral(teams)

    form = _neutral(teams)
    lo, hi = FORM_CLAMP
    for name, fc in zip(names, point_forecast):
        next_gd = float(np.ravel(fc)[0])
        baseline = float(series[name].mean())
        trend = next_gd - baseline            # >0 => improving form
        form[name] = float(np.clip(1.0 + FORM_GAIN * trend, lo, hi))
    print(f"[forecast] TimesFM produced form for {len(names)} teams.", file=sys.stderr)
    return form


if __name__ == "__main__":
    from .data import load_history, load_teams

    teams = list(load_teams())
    form = compute_form(load_history(), teams)
    spread = sorted(form.items(), key=lambda x: x[1])
    print(f"form values: min={spread[0]} max={spread[-1]} "
          f"(all 1.0 => TimesFM unavailable, expected locally)")
