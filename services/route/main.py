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
    poi: Optional[Dict[str, Any]] = None

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

class GeometryModel(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]

class RouteAlternativeModel(BaseModel):
    name: str
    focus: str
    stops: List[StopModel]
    metrics: RouteMetricsModel
    path_segments: List[str]
    geometry: Optional[GeometryModel] = None

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

    local_bias = req.balance_local_pct / 100.0

    # Ponderar candidatos con scoring multiobjetivo idéntico al solucionador OPTW
    scored_candidates = []
    for p in pois_data:
        if p["id"] not in poi_idx_map:
            continue
        p_idx = poi_idx_map[p["id"]]
        if p_idx == start_idx:
            continue
        dist_from_start = prof_mat["distance_meters"][start_idx][p_idx]
        if dist_from_start >= 999990:
            continue
        if req.profile == "silla_de_ruedas" and not p.get("entrance_accessible", False):
            continue

        if req.interests:
            p_cat = p.get("category", "")
            p_tags = p.get("tags", [])
            matches = sum(1 for req_int in req.interests if req_int in p_tags or req_int == p_cat)
            interest_score = matches / max(1, len(req.interests))
        else:
            interest_score = 0.5

        budget_score = max(0.0, 1.0 - (p.get("cost_mxn", 0.0) / max(1.0, req.max_budget_mxn)))

        is_outside = (p.get("zone") != "zocalo_centro_nucleo")
        if local_bias < 0.5:
            dispersion_score = 0.6 if is_outside else (1.0 + (0.5 - local_bias) * 0.8)
        else:
            dispersion_score = (1.0 + (local_bias - 0.5) * 1.0) if is_outside else 0.7

        local_score = 0.2 if p.get("is_local_business", False) else 0.0
        total_s_i = 0.45 * interest_score + 0.15 * budget_score + 0.25 * dispersion_score + 0.15 * local_score

        scored_candidates.append({
            "idx": p_idx,
            "poi": p,
            "score": total_s_i,
            "visit_duration": p.get("visit_duration_min", 30),
            "cost": p.get("cost_mxn", 0.0)
        })

    # Construcción secuencial optimizada basada en densidad de beneficio / costo de traslado
    visited = [start_idx]
    curr_time = 600 + start_poi["visit_duration_min"]
    curr_cost = start_poi["cost_mxn"]
    curr_dist = 0
    walk_min_accum = 0
    visit_min_accum = start_poi["visit_duration_min"]
    used_segs = []

    remaining = list(scored_candidates)
    while remaining:
        best_cand = None
        best_idx_in_rem = -1
        best_ratio = -1.0
        last_idx = visited[-1]

        for i, cand in enumerate(remaining):
            c_idx = cand["idx"]
            w_min = prof_mat["time_minutes"][last_idx][c_idx]
            if w_min >= 999990:
                continue
            ret_min = prof_mat["time_minutes"][c_idx][start_idx]
            total_est = (curr_time + w_min + cand["visit_duration"] + ret_min) - 600
            if total_est > req.max_time_min:
                continue
            if curr_cost + cand["cost"] > req.max_budget_mxn:
                continue

            ratio = cand["score"] / max(0.5, w_min)
            if ratio > best_ratio:
                best_ratio = ratio
                best_cand = cand
                best_idx_in_rem = i

        if not best_cand:
            break

        c_idx = best_cand["idx"]
        w_min = prof_mat["time_minutes"][last_idx][c_idx]
        w_dist = prof_mat["distance_meters"][last_idx][c_idx]

        visited.append(c_idx)
        curr_time += w_min + best_cand["visit_duration"]
        curr_cost += best_cand["cost"]
        curr_dist += w_dist
        walk_min_accum += w_min
        visit_min_accum += best_cand["visit_duration"]
        used_segs.extend(prof_mat["path_segments"][last_idx][c_idx])
        remaining.pop(best_idx_in_rem)

    # Recorrido abierto sin retorno cruzado (consistente con el optimizador OPTW del cliente)
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
            is_local_business=poi_item["is_local_business"],
            poi=poi_item
        ))

    # Construcción de polilínea continua sobre la red peatonal de banquetas (cero cruces por edificaciones)
    route_coords: List[List[float]] = []
    def push_coord(c: List[float]):
        if not route_coords:
            route_coords.append(c)
            return
        last = route_coords[-1]
        if abs(last[0] - c[0]) > 1e-6 or abs(last[1] - c[1]) > 1e-6:
            route_coords.append(c)

    curr_pos = start_poi["coordinates"]
    push_coord(curr_pos)

    for seg_id in used_segs:
        edge = edge_map.get(seg_id)
        if edge and "geometry" in edge and "coordinates" in edge["geometry"]:
            raw = edge["geometry"]["coordinates"]
            if raw:
                d_first = (curr_pos[0] - raw[0][0])**2 + (curr_pos[1] - raw[0][1])**2
                d_last = (curr_pos[0] - raw[-1][0])**2 + (curr_pos[1] - raw[-1][1])**2
                oriented = list(reversed(raw)) if d_last < d_first else raw
                for pt in oriented:
                    push_coord(pt)
                curr_pos = route_coords[-1]

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
        path_segments=used_segs,
        geometry=GeometryModel(coordinates=route_coords)
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
