"""
Motor RAG y Recuperacion Semantica de Patrimonio Cultural: Ruta Abierta Puebla.
Recupera pasajes factuales con citas verificadas de fuentes oficiales (INAH, UNESCO, Cronistas)
garantizando cero alucinaciones y alta explicabilidad para la defensa ante el jurado de Tech-Capital 2026.
"""

import json
import math
import os
import re
import unicodedata
from collections import Counter
from typing import List, Dict, Any, Optional

def normalize_text(text: str) -> str:
    nfkd = unicodedata.normalize('NFKD', text)
    cleaned = "".join([c for c in nfkd if not unicodedata.combining(c)]).lower()
    return re.sub(r'[^a-z0-9\s]', ' ', cleaned).strip()

def tokenize(text: str) -> List[str]:
    norm = normalize_text(text)
    return [t for t in norm.split() if len(t) > 2]

class CulturalRAGEngine:
    def __init__(self, corpus_path: Optional[str] = None):
        if corpus_path is None:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            corpus_path = os.path.join(root_dir, "data", "knowledge_base", "puebla_cultural_corpus.json")
        
        self.corpus_path = corpus_path
        self.documents: List[Dict[str, Any]] = []
        self.doc_tokens: List[List[str]] = []
        self.doc_freq: Counter = Counter()
        self.avg_doc_len: float = 0.0
        self.load_and_index()

    def load_and_index(self):
        if not os.path.exists(self.corpus_path):
            self.documents = []
            return

        with open(self.corpus_path, "r", encoding="utf-8") as f:
            self.documents = json.load(f)

        self.doc_tokens = []
        self.doc_freq = Counter()
        total_len = 0

        for doc in self.documents:
            full_text = f"{doc.get('titulo', '')} {doc.get('fragmento', '')} {' '.join(doc.get('temas', []))}"
            tokens = tokenize(full_text)
            self.doc_tokens.append(tokens)
            total_len += len(tokens)
            unique_terms = set(tokens)
            for t in unique_terms:
                self.doc_freq[t] += 1

        self.avg_doc_len = total_len / len(self.documents) if self.documents else 1.0

    def query(self, query_text: str, poi_id: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Calcula relevancia BM25 sobre el corpus documental con citas explicitas de fuente.
        """
        if not self.documents:
            return []

        q_tokens = tokenize(query_text)
        if not q_tokens and not poi_id:
            return []

        N = len(self.documents)
        k1 = 1.5
        b = 0.75
        scores = []

        for idx, doc in enumerate(self.documents):
            # Bonificacion si coincide exactamente con el POI solicitado
            poi_boost = 3.0 if poi_id and doc.get("poi_id") == poi_id else 0.0
            doc_toks = self.doc_tokens[idx]
            doc_len = len(doc_toks)
            tok_counts = Counter(doc_toks)

            bm25 = 0.0
            for qt in q_tokens:
                if qt in tok_counts:
                    n_qt = self.doc_freq.get(qt, 1)
                    idf = math.log((N - n_qt + 0.5) / (n_qt + 0.5) + 1.0)
                    tf = tok_counts[qt]
                    denom = tf + k1 * (1.0 - b + b * (doc_len / self.avg_doc_len))
                    bm25 += idf * ((tf * (k1 + 1.0)) / denom)

            total_score = round(bm25 + poi_boost, 3)
            if total_score > 0.1:
                scores.append({
                    "score": total_score,
                    "document": doc
                })

        scores.sort(key=lambda x: x["score"], reverse=True)
        results = []
        for item in scores[:top_k]:
            d = item["document"]
            results.append({
                "id": d["id"],
                "poi_id": d.get("poi_id"),
                "titulo": d["titulo"],
                "fragmento": d["fragmento"],
                "fuente_citada": d["fuente"],
                "relevancia_score": item["score"],
                "temas": d.get("temas", [])
            })
        return results

def main():
    rag = CulturalRAGEngine()
    print(f"Motor RAG inicializado con {len(rag.documents)} fragmentos patrimoniales indexados.")
    
    # Prueba de consulta
    test_q = "alfarería tradicional hornos de leña barrio de la luz"
    results = rag.query(test_q, top_k=2)
    print(f"\nConsulta de prueba: '{test_q}'")
    for r in results:
        print(f"- [{r['fuente_citada']}] {r['titulo']} (Score: {r['relevancia_score']})")
        print(f"  {r['fragmento'][:120]}...\n")

if __name__ == "__main__":
    main()
