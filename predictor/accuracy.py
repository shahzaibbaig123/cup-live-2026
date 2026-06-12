"""Scoring of past predictions against actual results.

We grade each completed match using the probabilities we published *before* it
was played (read from the previous predictions.json). Metrics: hit-rate
(argmax correct), Ranked Probability Score (RPS, lower is better) and Brier.
"""

from __future__ import annotations

# outcome order used everywhere: index 0 = home win, 1 = draw, 2 = away win
OUTCOMES = ("home", "draw", "away")


def outcome_of(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "home"
    if home_score < away_score:
        return "away"
    return "draw"


def rps_three(probs: tuple[float, float, float], actual: str) -> float:
    """Ranked Probability Score for the 3 ordered outcomes."""
    actual_vec = [1.0 if o == actual else 0.0 for o in OUTCOMES]
    cum_p = cum_a = 0.0
    total = 0.0
    for i in range(2):  # r-1 = 2 cumulative terms
        cum_p += probs[i]
        cum_a += actual_vec[i]
        total += (cum_p - cum_a) ** 2
    return 0.5 * total


def brier_three(probs: tuple[float, float, float], actual: str) -> float:
    actual_vec = [1.0 if o == actual else 0.0 for o in OUTCOMES]
    return sum((probs[i] - actual_vec[i]) ** 2 for i in range(3))


def predicted_outcome(probs: tuple[float, float, float]) -> str:
    return OUTCOMES[max(range(3), key=lambda i: probs[i])]


def summarize(history: list[dict]) -> dict:
    """Roll a list of scored-match entries into headline metrics."""
    n = len(history)
    if n == 0:
        return {"n": 0, "hitRate": None, "rps": None, "brier": None, "history": []}
    correct = sum(1 for h in history if h["correct"])
    return {
        "n": n,
        "hitRate": correct / n,
        "rps": sum(h["rps"] for h in history) / n,
        "brier": sum(h.get("brier", 0.0) for h in history) / n,
        "history": history,
    }
