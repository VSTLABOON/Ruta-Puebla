"""
Servicio de Accesibilidad y Ranking de Barreras: Ruta Abierta Puebla.
FastAPI + Evaluacion espacial de aceras.
"""

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os

app = FastAPI(
    title="Ruta Abierta Puebla - Accessibility Service",
    version="1.0.0",
    description="Servicio de consulta de segmentos de accesibilidad y ranking de impacto de barreras urbanas"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
geojson_data: Dict[str, Any] = {"type": "FeatureCollection", "features": []}
thresholds_data: Dict[str, Any] = {}

def load_data():
    global geojson_data, thresholds_data
    g_path = os.path.join(ROOT_DIR, "data", "processed", "accessibility_segments.geojson")
    t_path = os.path.join(ROOT_DIR, "config", "accessibility_thresholds.json")
    if os.path.exists(g_path):
        with open(g_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)
    if os.path.exists(t_path):
        with open(t_path, "r", encoding="utf-8") as f:
            thresholds_data = json.load(f)

load_data()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "accessibility-service",
        "segments_count": len(geojson_data.get("features", []))
    }

@app.get("/v1/accessibility/segments")
def get_segments(
    profile: Optional[str] = Query(None, description="sin_restriccion | movilidad_reducida | silla_de_ruedas"),
    only_verified: bool = Query(False, description="Filtrar solo tramos con alta confianza de verificacion")
):
    features = geojson_data.get("features", [])
    filtered = []

    for feat in features:
        props = feat.get("properties", {})
        if only_verified and not props.get("is_verified", False):
            continue
        if profile:
            prop_key = f"transitable_{profile}"
            if prop_key in props and not props[prop_key]:
                continue
        filtered.append(feat)

    return {
        "type": "FeatureCollection",
        "features": filtered,
        "total": len(filtered)
    }

@app.get("/v1/accessibility/barriers/ranking")
def get_barriers_ranking(profile: str = Query("silla_de_ruedas")):
    """
    Simula el impacto de corregir cada tramo bloqueado
    calculando cuantos POIs desbloquea y el beneficio ponderado.
    """
    features = geojson_data.get("features", [])
    prop_key = f"transitable_{profile}"

    blocked_segments = [
        f for f in features if not f.get("properties", {}).get(prop_key, True)
    ]

    ranking = []
    for rank_idx, feat in enumerate(blocked_segments):
        props = feat.get("properties", {})
        sid = props.get("id", f"seg_{rank_idx}")
        # Simulacion de POIs desbloqueados
        unlocked_count = 3 if "analco" in sid or "luz" in sid else 2
        weighted_score = round(unlocked_count * 15.0 + props.get("length_m", 50) * 0.2, 1)

        ranking.append({
            "segment_id": sid,
            "blocked_profile": profile,
            "zone": props.get("zone", "centro"),
            "barrier_cause": "escalon" if props.get("has_steps") else "falta_de_rampa_o_ancho",
            "unlocked_pois_count": unlocked_count,
            "weighted_impact_score": weighted_score
        })

    ranking.sort(key=lambda x: x["weighted_impact_score"], reverse=True)
    return {
        "profile": profile,
        "total_barriers_identified": len(ranking),
        "ranking": ranking
    }
