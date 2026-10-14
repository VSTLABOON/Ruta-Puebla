"""
Pruebas para el reporte de evaluacion con visitantes sinteticos.
"""

import json
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def test_simulation_metrics_integrity():
    sim_path = os.path.join(ROOT_DIR, "data", "processed", "simulation_metrics.json")
    report_path = os.path.join(ROOT_DIR, "docs", "simulation_report.md")

    assert os.path.exists(sim_path), "simulation_metrics.json no existe"
    assert os.path.exists(report_path), "simulation_report.md no existe"

    with open(sim_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["total_scenarios_simulated"] >= 100
    assert "metrics_summary" in data
    assert "unfavorable_findings" in data
    assert len(data["unfavorable_findings"]) >= 2, "Debe contener al menos 2 hallazgos desfavorables explicitos"

    summary = data["metrics_summary"]
    for strat in ["clasica", "mas_corta", "optimizada"]:
        assert strat in summary
        strat_metrics = summary[strat]
        for m_key in ["pct_outside_core", "pct_local_spend", "pct_verified", "walking_distance_m", "total_time_min"]:
            m_val = strat_metrics[m_key]
            assert "mean" in m_val
            assert "ci_95_lower" in m_val
            assert "ci_95_upper" in m_val
            assert m_val["ci_95_lower"] <= m_val["ci_95_upper"]
