"""
Servicio de Ruteo Peatonal y Optimizador OPTW: Ruta Abierta Puebla.
FastAPI + Matrices en memoria.
"""

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import os

app = FastAPI(
    title="Ruta Abierta Puebla - Route Service",
    version="1.0.0",
    description="Servicio de generacion y optimizacion de rutas peatonales con perfiles de accesibilidad"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos de entrada y salida
class RouteRequestModel(BaseModel):
    profile: str = Field(..., description="sin_restriccion | movilidad_reducida | silla_de_ruedas")
    max_time_min: int = Field(180, ge=30, le=480)
    max_budget_mxn: float = Field(200.0, ge=0.0)
    interests: List[str] = Field(default_factory=list)
    free_text: Optional[str] = None
    language: str = Field("es", pattern="^(es|en)$")
    start_poi_id: str = Field("poi_catedral")
    balance_local_pct: int = Field(50, ge=0, le=100)

class StopModel(BaseModel):
    stop_order: int
    poi_id: str
    poi_name: str
    zone: str
    arrival_time_min: int
    departure_time_min: int
    cost_mxn: float
    score_s_i: float
    is_local_business: bool

class RouteMetricsModel(BaseModel):
    total_time_min: int
    walking_time_min: int
    visit_time_min: int
    distance_meters: int
    total_cost_mxn: float
    pct_verified: int
    pct_local_stops: int
    pct_outside_core: int
    feasible_for_profile: bool

class RouteAlternativeModel(BaseModel):
    name: str
    focus: str
    stops: List[StopModel]
    metrics: RouteMetricsModel
    path_segments: List[str]

class RouteResponseModel(BaseModel):
    main_route: RouteAlternativeModel
    alternative_routes: List[RouteAlternativeModel]
    explanation: Dict[str, str]

# Carga de datos estaticos en memoria al iniciar
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
pois_data: List[Dict[str, Any]] = []
matrices_data: Dict[str, Any] = {}
graph_data: Dict[str, Any] = {}

def load_data():
    global pois_data, matrices_data, graph_data
    p_path = os.path.join(ROOT_DIR, "data", "processed", "pois.json")
    m_path = os.path.join(ROOT_DIR, "data", "processed", "time_matrices.json")
    g_path = os.path.join(ROOT_DIR, "data", "processed", "sidewalk_graph.json")

    if os.path.exists(p_path):
        with open(p_path, "r", encoding="utf-8") as f:
            pois_data = json.load(f)
    if os.path.exists(m_path):
        with open(m_path, "r", encoding="utf-8") as f:
            matrices_data = json.load(f)
    if os.path.exists(g_path):
        with open(g_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)

load_data()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "route-service",
        "pois_loaded": len(pois_data),
        "profiles_available": list(matrices_data.get("profiles", {}).keys())
    }

@app.post("/v1/routes/generate", response_model=RouteResponseModel)
def generate_route(req: RouteRequestModel):
    if not pois_data or not matrices_data:
        raise HTTPException(status_code=500, detail="Artefactos de red y matrices no cargados en memoria")

    if req.profile not in matrices_data["profiles"]:
        raise HTTPException(status_code=400, detail=f"Perfil no valido: {req.profile}")

    poi_map = {p["id"]: p for p in pois_data}
    poi_idx_map = {id_: idx for idx, id_ in enumerate(matrices_data["poi_ids"])}
    start_id = req.start_poi_id if req.start_poi_id in poi_map else matrices_data["poi_ids"][0]
    start_idx = poi_idx_map[start_id]
    start_poi = poi_map[start_id]

    prof_mat = matrices_data["profiles"][req.profile]
    edge_map = {e["id"]: e for e in graph_data.get("edges", [])}

    # Seleccion voraz de paradas
    visited = [start_idx]
    curr_time = 600 + start_poi["visit_duration_min"]
    curr_cost = start_poi["cost_mxn"]
    curr_dist = 0
    walk_min_accum = 0
    visit_min_accum = start_poi["visit_duration_min"]
    used_segs = []

    # Filtrar candidatos viables
    candidates = []
    for p in pois_data:
        p_idx = poi_idx_map[p["id"]]
        if p_idx == start_idx:
            continue
        dist_from_start = prof_mat["distance_meters"][start_idx][p_idx]
        if dist_from_start >= 999990:
            continue
        if req.profile == "silla_de_ruedas" and not p["entrance_accessible"]:
            continue
        candidates.append((p_idx, p))

    for c_idx, cand in candidates:
        last_idx = visited[-1]
        w_min = prof_mat["time_minutes"][last_idx][c_idx]
        if w_min >= 999990:
            continue
        w_dist = prof_mat["distance_meters"][last_idx][c_idx]
        ret_min = prof_mat["time_minutes"][c_idx][start_idx]

        total_est = (curr_time + w_min + cand["visit_duration_min"] + ret_min) - 600
        if total_est > req.max_time_min:
            continue
        if curr_cost + cand["cost_mxn"] > req.max_budget_mxn:
            continue

        visited.append(c_idx)
        curr_time += w_min + cand["visit_duration_min"]
        curr_cost += cand["cost_mxn"]
        curr_dist += w_dist
        walk_min_accum += w_min
        visit_min_accum += cand["visit_duration_min"]
        used_segs.extend(prof_mat["path_segments"][last_idx][c_idx])

    # Segmento de retorno
    if len(visited) > 1:
        ret_last = visited[-1]
        ret_min = prof_mat["time_minutes"][ret_last][start_idx]
        ret_dist = prof_mat["distance_meters"][ret_last][start_idx]
        curr_dist += ret_dist
        walk_min_accum += ret_min
        used_segs.extend(prof_mat["path_segments"][ret_last][start_idx])

    # Construccion de paradas
    stops_list: List[StopModel] = []
    t_cursor = 600
    for idx_order, idx_p in enumerate(visited):
        poi_item = pois_data[idx_p]
        arr_t = t_cursor
        dep_t = arr_t + poi_item["visit_duration_min"]
        t_cursor = dep_t
        stops_list.append(StopModel(
            stop_order=idx_order + 1,
            poi_id=poi_item["id"],
            poi_name=poi_item["name"],
            zone=poi_item["zone"],
            arrival_time_min=arr_t,
            departure_time_min=dep_t,
            cost_mxn=poi_item["cost_mxn"],
            score_s_i=0.85,
            is_local_business=poi_item["is_local_business"]
        ))

    unique_segs = list(set(used_segs))
    tot_len = sum(edge_map[s]["length_m"] for s in unique_segs if s in edge_map)
    ver_len = sum(edge_map[s]["length_m"] for s in unique_segs if s in edge_map and edge_map[s]["is_verified"])
    pct_ver = int((ver_len / tot_len * 100)) if tot_len > 0 else 0

    non_start_stops = stops_list[1:] if len(stops_list) > 1 else stops_list
    pct_local = int((sum(1 for s in non_start_stops if s.is_local_business) / len(non_start_stops)) * 100) if non_start_stops else 0
    pct_outside = int((sum(1 for s in non_start_stops if s.zone != "zocalo_centro_nucleo") / len(non_start_stops)) * 100) if non_start_stops else 0

    metrics = RouteMetricsModel(
        total_time_min=int(walk_min_accum + visit_min_accum),
        walking_time_min=int(walk_min_accum),
        visit_time_min=int(visit_min_accum),
        distance_meters=int(curr_dist),
        total_cost_mxn=curr_cost,
        pct_verified=pct_ver,
        pct_local_stops=pct_local,
        pct_outside_core=pct_outside,
        feasible_for_profile=True
    )

    main_alt = RouteAlternativeModel(
        name="Ruta Optimizada Sostenible",
        focus="optimizada",
        stops=stops_list,
        metrics=metrics,
        path_segments=unique_segs
    )

    explanation = {
        "es": f"Ruta resuelta por FastAPI para perfil {req.profile} con {len(stops_list)} paradas. El {pct_ver}% de los tramos cuenta con verificacion presencial de alta confianza.",
        "en": f"Route solved by FastAPI for {req.profile} profile with {len(stops_list)} stops. {pct_ver}% of segments have high-confidence on-site audit verification."
    }

    return RouteResponseModel(
        main_route=main_alt,
        alternative_routes=[],
        explanation=explanation
    )
