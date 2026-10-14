"""
Pruebas automatizadas de integridad topologica y funcional del grafo de aceras
y matrices de tiempo para Ruta Abierta Puebla.
"""

import json
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

@pytest.fixture
def processed_data():
    graph_path = os.path.join(ROOT_DIR, "data", "processed", "sidewalk_graph.json")
    pois_path = os.path.join(ROOT_DIR, "data", "processed", "pois.json")
    matrices_path = os.path.join(ROOT_DIR, "data", "processed", "time_matrices.json")
    geojson_path = os.path.join(ROOT_DIR, "data", "processed", "accessibility_segments.geojson")

    assert os.path.exists(graph_path), "sidewalk_graph.json no existe"
    assert os.path.exists(pois_path), "pois.json no existe"
    assert os.path.exists(matrices_path), "time_matrices.json no existe"
    assert os.path.exists(geojson_path), "accessibility_segments.geojson no existe"

    with open(graph_path, "r", encoding="utf-8") as f:
        graph = json.load(f)
    with open(pois_path, "r", encoding="utf-8") as f:
        pois = json.load(f)
    with open(matrices_path, "r", encoding="utf-8") as f:
        matrices = json.load(f)
    with open(geojson_path, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    return {
        "graph": graph,
        "pois": pois,
        "matrices": matrices,
        "geojson": geojson
    }

def test_graph_edges_have_positive_dimensions(processed_data):
    graph = processed_data["graph"]
    edges = graph["edges"]
    assert len(edges) > 0, "El grafo no contiene aristas"

    for e in edges:
        assert e["length_m"] > 0, f"Arista {e['id']} con longitud no positiva"
        assert e["width_m"] > 0, f"Arista {e['id']} con ancho no positivo"
        assert e["slope_pct"] >= 0, f"Arista {e['id']} con pendiente negativa"
        assert 0.0 <= e["confidence"] <= 1.0, f"Arista {e['id']} con confianza fuera de [0, 1]"

def test_all_pois_have_valid_coordinates_and_hours(processed_data):
    pois = processed_data["pois"]
    assert len(pois) >= 10, "Catalogo de POIs insuficiente"

    for p in pois:
        lon, lat = p["coordinates"]
        assert -98.210 <= lon <= -98.180, f"POI {p['id']} fuera del rango de longitud de Puebla"
        assert 19.030 <= lat <= 19.060, f"POI {p['id']} fuera del rango de latitud de Puebla"
        assert "open" in p["hours"] and "close" in p["hours"], f"POI {p['id']} sin horario definido"
        assert p["cost_mxn"] >= 0, f"POI {p['id']} con costo negativo"
        assert p["visit_duration_min"] > 0, f"POI {p['id']} con tiempo de visita nulo"

def test_wheelchair_accessibility_strict_exclusion(processed_data):
    matrices = processed_data["matrices"]
    wc_mat = matrices["profiles"]["silla_de_ruedas"]
    graph = processed_data["graph"]
    edge_map = {e["id"]: e for e in graph["edges"]}

    # Verificar que ningun camino utilizado por silla de ruedas contenga aristas intransitables
    path_segments = wc_mat["path_segments"]
    for i in range(len(path_segments)):
        for j in range(len(path_segments[i])):
            segs = path_segments[i][j]
            for sid in segs:
                edge = edge_map.get(sid)
                assert edge is not None, f"Arista {sid} en camino pero ausente en grafo"
                assert edge["transitable"]["silla_de_ruedas"] is True, (
                    f"Arista intransitable {sid} utilizada en matriz de silla de ruedas de {i} a {j}"
                )

def test_triangle_inequality_on_reachable_nodes(processed_data):
    matrices = processed_data["matrices"]
    std_dist = matrices["profiles"]["sin_restriccion"]["distance_meters"]
    n = len(std_dist)

    # Para todo trío de nodos alcanzables i, j, k: d(i, k) <= d(i, j) + d(j, k) + epsilon
    epsilon = 0.5  # Margen por redondeo flotante
    for i in range(n):
        for j in range(n):
            for k in range(n):
                d_ik = std_dist[i][k]
                d_ij = std_dist[i][j]
                d_jk = std_dist[j][k]
                if d_ik < 99900 and d_ij < 99900 and d_jk < 99900:
                    assert d_ik <= d_ij + d_jk + epsilon, (
                        f"Violacion de desigualdad triangular: d({i},{k})={d_ik} > d({i},{j})={d_ij} + d({j},{k})={d_jk}"
                    )
