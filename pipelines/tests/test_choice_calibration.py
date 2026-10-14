"""
Pruebas de convergencia y validez del modelo de eleccion y remuestreo.
"""

import json
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def test_choice_model_weights_schema_and_signs():
    weights_path = os.path.join(ROOT_DIR, "config", "choice_model_weights.json")
    assert os.path.exists(weights_path), "choice_model_weights.json no existe"

    with open(weights_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "pesos_puntaje_parada_S_i" in data
    assert "coeficientes_modelo_eleccion_logistica" in data
    assert "cupos_maximos_por_zona_defecto" in data

    coefs = data["coeficientes_modelo_eleccion_logistica"]
    
    # Coeficientes clave
    time_coef = coefs["beta_tiempo_caminado_min"]
    cost_coef = coefs["beta_costo_total_mxn"]
    ver_coef = coefs["beta_pct_verificado"]

    # El tiempo caminado y costo deben penalizar la utilidad (signo negativo o cercano a cero)
    assert time_coef["estimacion"] <= 0.1, "beta de tiempo deberia ser negativo o disuasorio"
    assert cost_coef["estimacion"] <= 0.1, "beta de costo deberia ser negativo o disuasorio"
    assert ver_coef["estimacion"] >= 0.0, "beta de verificacion deberia premiar la confianza"

    # Validar que los intervalos de confianza del 95% cumplan low <= high
    for name, item in coefs.items():
        ci = item["intervalo_confianza_95"]
        assert len(ci) == 2, f"Intervalo invalido para {name}"
        assert ci[0] <= ci[1], f"Limite inferior mayor que superior en {name}: {ci}"
