import os
import sys
import pytest
from starlette.testclient import TestClient

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from services.route.main import app as route_app
from services.accessibility.main import app as access_app
from services.recommend.main import app as recommend_app

route_client = TestClient(route_app)
access_client = TestClient(access_app)
recommend_client = TestClient(recommend_app)

def test_route_service_health():
    res = route_client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["pois_loaded"] >= 10

def test_route_service_generate_endpoint():
    payload = {
        "profile": "silla_de_ruedas",
        "max_time_min": 180,
        "max_budget_mxn": 250.0,
        "interests": ["patrimonio", "artesania"],
        "language": "es",
        "start_poi_id": "poi_catedral",
        "balance_local_pct": 50
    }
    res = route_client.post("/v1/routes/generate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "main_route" in data
    assert "explanation" in data
    assert data["main_route"]["metrics"]["feasible_for_profile"] is True

def test_accessibility_service_endpoints():
    # Health
    res_h = access_client.get("/health")
    assert res_h.status_code == 200

    # Segmentos filtrados por perfil
    res_seg = access_client.get("/v1/accessibility/segments?profile=silla_de_ruedas&only_verified=true")
    assert res_seg.status_code == 200
    data_seg = res_seg.json()
    assert data_seg["type"] == "FeatureCollection"
    assert "features" in data_seg

    # Ranking de barreras
    res_rank = access_client.get("/v1/accessibility/barriers/ranking?profile=silla_de_ruedas")
    assert res_rank.status_code == 200
    data_rank = res_rank.json()
    assert "ranking" in data_rank
    assert data_rank["total_barriers_identified"] >= 1

def test_recommend_service_endpoints():
    # Health
    res_h = recommend_client.get("/health")
    assert res_h.status_code == 200

    # Matching de intereses
    payload = {
        "interests": ["gastronomia", "cemitas"],
        "free_text": "antojitos tipicos de mercado",
        "language": "es"
    }
    res_match = recommend_client.post("/v1/interests/match", json=payload)
    assert res_match.status_code == 200
    data_match = res_match.json()
    assert len(data_match["matches"]) >= 5
    # Mercado El Alto debe puntuar alto
    top_ids = [m["poi_id"] for m in data_match["matches"][:3]]
    assert "poi_mercado_el_alto" in top_ids or "poi_antojeria_xanenetla" in top_ids

    # Pesos del modelo de eleccion
    res_w = recommend_client.get("/v1/choice/weights")
    assert res_w.status_code == 200
    data_w = res_w.json()
    assert "coeficientes_modelo_eleccion_logistica" in data_w

def test_recommend_service_cultural_rag():
    payload = {
        "query": "hornos de lena barro la luz",
        "top_k": 2
    }
    res = recommend_client.post("/v1/cultural/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] >= 1
    first_res = data["results"][0]
    assert "fuente_citada" in first_res
    assert "relevancia_score" in first_res
    assert "fragmento" in first_res

