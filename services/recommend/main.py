"""
Servicio de Recomendacion y Preferencias: Ruta Abierta Puebla.
FastAPI + Emparejamiento de intereses y coeficientes del modelo de eleccion.
"""

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import os
import unicodedata

app = FastAPI(
    title="Ruta Abierta Puebla - Recommendation Service",
    version="1.0.0",
    description="Servicio de emparejamiento de intereses tematicos y calibracion de modelo de eleccion"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
pois_data: List[Dict[str, Any]] = []
weights_data: Dict[str, Any] = {}

def normalize_text(text: str) -> str:
    nfkd = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).lower().strip()

def load_data():
    global pois_data, weights_data
    p_path = os.path.join(ROOT_DIR, "data", "processed", "pois.json")
    w_path = os.path.join(ROOT_DIR, "config", "choice_model_weights.json")
    if os.path.exists(p_path):
        with open(p_path, "r", encoding="utf-8") as f:
            pois_data = json.load(f)
    if os.path.exists(w_path):
        with open(w_path, "r", encoding="utf-8") as f:
            weights_data = json.load(f)

load_data()

class InterestMatchRequest(BaseModel):
    interests: List[str] = Field(default_factory=list)
    free_text: Optional[str] = None
    language: str = Field("es")

class ZoneCapsUpdateRequest(BaseModel):
    zone_caps: Dict[str, int]

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "recommend-service",
        "pois_available": len(pois_data)
    }

@app.post("/v1/interests/match")
def match_interests(req: InterestMatchRequest):
    results = []
    norm_interests = [normalize_text(i) for i in req.interests]
    norm_free_tokens = normalize_text(req.free_text or "").split() if req.free_text else []

    for p in pois_data:
        score = 0.2  # Base minima
        p_cat = normalize_text(p.get("category", ""))
        p_tags = [normalize_text(t) for t in p.get("tags", [])]
        p_desc = normalize_text(p.get("description", {}).get(req.language, "") + " " + p.get("name", ""))

        for it in norm_interests:
            if it in p_cat or p_cat in it:
                score += 0.3
            for tag in p_tags:
                if it in tag or tag in it:
                    score += 0.2

        for token in norm_free_tokens:
            if len(token) > 3 and token in p_desc:
                score += 0.25

        score = min(1.0, round(score, 2))
        results.append({
            "poi_id": p["id"],
            "poi_name": p["name"],
            "category": p["category"],
            "zone": p["zone"],
            "match_score": score
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {
        "query_interests": req.interests,
        "matches": results
    }

@app.get("/v1/choice/weights")
def get_choice_weights():
    return weights_data

@app.get("/v1/zones/caps")
def get_zone_caps():
    return weights_data.get("cupos_maximos_por_zona_defecto", {})

@app.put("/v1/zones/caps")
def update_zone_caps(req: ZoneCapsUpdateRequest):
    global weights_data
    weights_data["cupos_maximos_por_zona_defecto"] = req.zone_caps
    w_path = os.path.join(ROOT_DIR, "config", "choice_model_weights.json")
    with open(w_path, "w", encoding="utf-8") as f:
        json.dump(weights_data, f, indent=2, ensure_ascii=False)
    return {
        "status": "updated",
        "zone_caps": weights_data["cupos_maximos_por_zona_defecto"]
    }

from pipelines.src.cultural_rag import CulturalRAGEngine

rag_corpus_path = os.path.join(ROOT_DIR, "data", "knowledge_base", "puebla_cultural_corpus.json")
rag_engine = CulturalRAGEngine(rag_corpus_path)

class CulturalQueryRequest(BaseModel):
    query: str
    poi_id: Optional[str] = None
    top_k: int = 3

@app.post("/v1/cultural/query")
def query_cultural_knowledge(req: CulturalQueryRequest):
    """
    Motor RAG para consulta de patrimonio cultural y memoria viva con citas de fuentes oficiales.
    """
    results = rag_engine.query(req.query, poi_id=req.poi_id, top_k=req.top_k)
    return {
        "query": req.query,
        "poi_id": req.poi_id,
        "total_results": len(results),
        "results": results
    }

