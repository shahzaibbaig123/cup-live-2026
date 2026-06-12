"""Orchestrator: build public/predictions.json.

Pipeline: Elo (history) → calibrate goal model → TimesFM form → per-match
forecasts → freeze pre-match probabilities → score completed matches →
Monte-Carlo title/round odds. Re-runs are idempotent and safe: predictions
for a match are frozen the moment it kicks off, so accuracy is graded against
what we actually published beforehand.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from . import accuracy
from .data import load_fixtures, load_history, load_teams
from .forecast import compute_form
from .match_model import calibrate, predict_match
from .ratings import compute_elo
from .simulate import run as run_sim

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "predictions.json")
N_SIMS = int(os.environ.get("PREDICT_SIMS", "20000"))


def _load_previous() -> dict:
    try:
        with open(OUT_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def build() -> dict:
    history = load_history()
    teams = load_teams()
    fixtures = load_fixtures()

    ratings, calib = compute_elo(history)
    params = calibrate(calib)
    form = compute_form(history, list(teams))
    timesfm_used = any(abs(v - 1.0) > 1e-9 for v in form.values())

    prev = _load_previous()
    prev_matches: dict = prev.get("matches", {})
    prev_history: list = prev.get("accuracy", {}).get("history", [])
    scored_ids = {h["matchId"] for h in prev_history}
    history_log = list(prev_history)

    matches_out: dict[str, dict] = {}
    for fx in fixtures:
        if fx.home not in teams or fx.away not in teams:
            continue  # knockout placeholder — teams not yet known
        rh = ratings[fx.home]
        ra = ratings[fx.away]
        pred = predict_match(
            rh, ra, params, neutral=True,
            form_home=form.get(fx.home, 1.0), form_away=form.get(fx.away, 1.0),
        )
        cur_probs = (pred.p_home, pred.p_draw, pred.p_away)

        prev_m = prev_matches.get(fx.id)
        # Freeze the pre-match prediction once the match is no longer 'pre'.
        if fx.status != "pre" and prev_m and "pHome" in prev_m:
            probs = (prev_m["pHome"], prev_m["pDraw"], prev_m["pAway"])
        else:
            probs = cur_probs

        record = {
            "home": teams[fx.home].espn_name,
            "away": teams[fx.away].espn_name,
            "homeId": fx.home_id,
            "awayId": fx.away_id,
            "stage": fx.stage_slug,
            "date": fx.date,
            "status": fx.status,
            "pHome": round(probs[0], 4),
            "pDraw": round(probs[1], 4),
            "pAway": round(probs[2], 4),
            "predicted": accuracy.predicted_outcome(probs),
            "xHome": pred.exp_home,
            "xAway": pred.exp_away,
        }

        if fx.played and fx.home_score is not None and fx.away_score is not None:
            actual = accuracy.outcome_of(fx.home_score, fx.away_score)
            record["result"] = actual
            record["score"] = f"{fx.home_score}-{fx.away_score}"
            if fx.id not in scored_ids:
                history_log.append({
                    "date": fx.date,
                    "matchId": fx.id,
                    "home": record["home"],
                    "away": record["away"],
                    "predicted": record["predicted"],
                    "actual": actual,
                    "correct": record["predicted"] == actual,
                    "rps": round(accuracy.rps_three(probs, actual), 4),
                    "brier": round(accuracy.brier_three(probs, actual), 4),
                })
                scored_ids.add(fx.id)
        matches_out[fx.id] = record

    history_log.sort(key=lambda h: h["date"])
    acc = accuracy.summarize(history_log)

    sim = run_sim(teams, ratings, form, params, fixtures, n_sims=N_SIMS)
    title_odds = []
    for name, t in teams.items():
        title_odds.append({
            "teamId": t.espn_id,
            "name": t.espn_name,
            "logo": t.logo,
            "group": t.group,
            "elo": round(ratings[name], 1),
            "form": round(form.get(name, 1.0), 3),
            "winCup": round(sim.title[name], 4),
            "reachFinal": round(sim.final[name], 4),
            "reachR16": round(sim.r16[name], 4),
            "qualify": round(sim.qualify[name], 4),
            "winGroup": round(sim.win_group[name], 4),
        })
    title_odds.sort(key=lambda x: x["winCup"], reverse=True)

    out = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "meta": {
            "model": "Elo + Dixon-Coles Poisson + TimesFM form (hybrid)",
            "timesfmUsed": timesfm_used,
            "nSims": sim.n_sims,
            "betaPerElo": round(params.beta, 5),
            "totalGoals": round(params.total_goals, 3),
            "rho": round(params.rho, 3),
        },
        "matches": matches_out,
        "titleOdds": title_odds,
        "accuracy": acc,
    }

    # Avoid churn: if nothing but the timestamp would change, keep the old
    # timestamp so the file stays byte-identical and the cron skips the commit.
    if prev:
        without_ts = lambda d: {k: v for k, v in d.items() if k != "generatedAt"}
        if without_ts(out) == without_ts(prev):
            out["generatedAt"] = prev["generatedAt"]

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return out


if __name__ == "__main__":
    result = build()
    n_played = sum(1 for m in result["matches"].values() if m.get("result"))
    print(f"wrote {os.path.relpath(OUT_PATH)}")
    print(f"  generatedAt : {result['generatedAt']}")
    print(f"  TimesFM used: {result['meta']['timesfmUsed']}")
    print(f"  matches     : {len(result['matches'])} ({n_played} played/scored)")
    acc = result["accuracy"]
    if acc["n"]:
        print(f"  accuracy    : {acc['hitRate']:.0%} hit-rate, RPS {acc['rps']:.3f} over {acc['n']} games")
    print("  top 5 title odds:")
    for t in result["titleOdds"][:5]:
        print(f"    {t['name']:14} {t['winCup']:.1%}")
