"""Offline World Cup 2026 prediction pipeline.

Builds per-match win/draw/loss forecasts, tournament title odds, qualification
odds and an accuracy log, written to ``public/predictions.json`` for the app.

The engine is a hybrid: international Elo + a Dixon-Coles bivariate Poisson
goal model, with an optional TimesFM "form" feature layered on top. Everything
except TimesFM runs on numpy alone, so the pipeline works anywhere; TimesFM is
imported lazily and degrades to a neutral form index when unavailable.
"""
