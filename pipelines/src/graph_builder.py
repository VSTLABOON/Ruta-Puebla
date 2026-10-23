"""
Constructor del grafo de aceras, calculo de confianza de auditorias
y matrices de tiempo para Ruta Abierta Puebla.
"""

import json
import math
import os
import csv
from datetime import datetime, timezone

def distance_haversine(coord1, coord2):
    """Calcula la distancia en metros entre dos coordenadas [lon, lat]"""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    R = 6371000.0  # Radio terrestre en metros
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def compute_audit_confidence(audits_for_segment, thresholds_cfg):
    """
    Calcula el indice de confianza del tramo a partir de:
    - Volumen de auditorias
    - Concordancia entre pares
    - Antiguedad
    """
    cfg = thresholds_cfg.get("evaluacion_confianza_tramos", {})
    base_no_auditado = cfg.get("confianza_base_no_auditado", 0.15)
    
    if not audits_for_segment:
        return base_no_auditado, 0, False

    count = len(audits_for_segment)
    peso_vol = cfg.get("peso_volumen_auditorias", 0.40)
    peso_agr = cfg.get("peso_concordancia_auditores", 0.40)
    peso_rec = cfg.get("peso_antiguedad_dias", 0.20)

    # Factor de volumen
    vol_score = min(1.0, count / 2.0)

    # Factor de concordancia si hay 2 o mas auditorias
    if count >= 2:
        # Concordancia en presencia de escalones y rampas
        has_steps_vals = [a["has_steps"] for a in audits_for_segment]
        ramp_vals = [a["ramp_start"] and a["ramp_end"] for a in audits_for_segment]
        widths = [float(a["free_width_m"]) for a in audits_for_segment]

        steps_agree = 1.0 if len(set(has_steps_vals)) == 1 else 0.5
        ramp_agree = 1.0 if len(set(ramp_vals)) == 1 else 0.5
        width_std = max(widths) - min(widths)
        width_agree = 1.0 if width_std <= 0.20 else max(0.0, 1.0 - width_std)

        agr_score = (steps_agree * 0.4) + (ramp_agree * 0.3) + (width_agree * 0.3)
    else:
        agr_score = 0.70  # Valor moderado para un solo auditor

    # Factor de antiguedad (dias transcurridos desde fecha de auditoria)
    now = datetime(2026, 10, 12, tzinfo=timezone.utc)
    dates = []
    for a in audits_for_segment:
        try:
            dt = datetime.fromisoformat(a["timestamp"].replace("Z", "+00:00"))
            dates.append(dt)
        except Exception:
            dates.append(now)
    latest_dt = max(dates) if dates else now
    days_old = max(0, (now - latest_dt).days)
    max_days = cfg.get("dias_vida_util_auditoria", 365)
    rec_score = max(0.0, 1.0 - (days_old / max_days))

    confidence = (vol_score * peso_vol) + (agr_score * peso_agr) + (rec_score * peso_rec)
    confidence = round(min(1.0, max(0.0, confidence)), 3)
    is_verified = confidence >= cfg.get("umbral_alta_confianza", 0.70)

    return confidence, count, is_verified

PROFILES = ["sin_restriccion", "movilidad_reducida", "silla_de_ruedas"]

def evaluate_transitability(width, slope, surface, curb_ramp, has_steps, thresholds_cfg):
    """
    Evalua la transitabilidad funcional por perfil con los umbrales de
    config/accessibility_thresholds.json. Devuelve (transitable, causas) donde
    causas[perfil] es la lista de condiciones incumplidas.
    """
    perfiles = thresholds_cfg["nivel_2_transitabilidad_funcional"]["perfiles"]
    transitable = {}
    causes = {}
    for prof in PROFILES:
        rules = perfiles[prof]
        c = []
        if width < rules["ancho_libre_minimo_metros"]:
            c.append("ancho_insuficiente")
        if slope > rules["pendiente_longitudinal_maxima_porcentaje"]:
            c.append("pendiente_excesiva")
        if has_steps and not rules["permite_escalones"]:
            c.append("escalon")
        if rules["requiere_rampa_en_cruces"] and not curb_ramp:
            c.append("sin_rampa")
        if surface in rules.get("superficies_bloqueadas", []):
            c.append("superficie_bloqueada")
        transitable[prof] = len(c) == 0
        causes[prof] = c
    return transitable, causes

def reachable_nodes(adj, start):
    seen = {start}
    stack = [start]
    while stack:
        u = stack.pop()
        for v, _l, _s in adj.get(u, []):
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return seen

def compute_barrier_ranking(segments, node_ids, poi_access_node, pois, start_poi_id, thresholds_cfg):
    """
    Para cada tramo bloqueado en un perfil, simula su correccion (lo vuelve
    transitable) y cuenta cuantos POIs adicionales quedan alcanzables desde el
    punto de partida. Calculo exacto por conectividad sobre el grafo.
    """
    poi_zone = {p["id"]: p["zone"] for p in pois}
    poi_local = {p["id"]: p["is_local_business"] for p in pois}
    start_node = poi_access_node[start_poi_id]
    result = {}
    for prof in ["movilidad_reducida", "silla_de_ruedas"]:
        base_adj = {n: [] for n in node_ids}
        for s in segments:
            if s["transitable"][prof]:
                base_adj[s["from_node"]].append((s["to_node"], s["length_m"], s["id"]))
                base_adj[s["to_node"]].append((s["from_node"], s["length_m"], s["id"]))
        base_reach = reachable_nodes(base_adj, start_node)
        base_pois = {pid for pid, n in poi_access_node.items() if n in base_reach}

        ranking = []
        for s in segments:
            if s["transitable"][prof]:
                continue
            adj = {n: list(v) for n, v in base_adj.items()}
            adj[s["from_node"]].append((s["to_node"], s["length_m"], s["id"]))
            adj[s["to_node"]].append((s["from_node"], s["length_m"], s["id"]))
            reach = reachable_nodes(adj, start_node)
            new_pois = sorted(pid for pid, n in poi_access_node.items() if n in reach and pid not in base_pois)
            _t, causes = evaluate_transitability(
                s["width_m"], s["slope_pct"], s["surface"], s["has_curb_ramp"], s["has_steps"], thresholds_cfg
            )
            ranking.append({
                "segment_id": s["id"],
                "zone": s["zone"],
                "length_m": s["length_m"],
                "barrier_causes": causes[prof],
                "unlocked_pois": new_pois,
                "unlocked_pois_count": len(new_pois),
                "unlocked_local_business_count": sum(1 for pid in new_pois if poi_local.get(pid)),
                "unlocked_zones": sorted({poi_zone[pid] for pid in new_pois})
            })
        ranking.sort(key=lambda r: (-r["unlocked_pois_count"], -r["unlocked_local_business_count"], r["length_m"]))
        result[prof] = {
            "start_poi_id": start_poi_id,
            "pois_reachable_now": sorted(base_pois),
            "blocked_segments": len(ranking),
            "ranking": ranking
        }
    return {
        "metodo": "Para cada tramo bloqueado se recalcula la conectividad del grafo suponiendo el tramo corregido; se cuentan los POIs que pasan a ser alcanzables desde el punto de partida. No incluye costo de obra.",
        "profiles": result
    }

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    config_path = os.path.join(root_dir, "config", "accessibility_thresholds.json")
    pois_raw_path = os.path.join(root_dir, "data", "raw", "pois_curated.json")
    audits_csv_path = os.path.join(root_dir, "data", "raw", "field_audits.csv")

    with open(config_path, "r", encoding="utf-8") as f:
        thresholds_cfg = json.load(f)

    with open(pois_raw_path, "r", encoding="utf-8") as f:
        pois = json.load(f)

    # Cargar auditorias de campo
    audits_by_segment = {}
    if os.path.exists(audits_csv_path):
        with open(audits_csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sid = row["segment_id"]
                audits_by_segment.setdefault(sid, []).append(row)

    # Definir esquinas y nodos base del poligono piloto
    # Malla conectada que cubre los 34 POIs en Centro Nucleo, Analco, La Luz, El Alto y Xanenetla
    base_nodes = {
        "n_zocalo_nw": [-98.1990, 19.0435],
        "n_zocalo_ne": [-98.1975, 19.0435],
        "n_zocalo_se": [-98.1975, 19.0428],
        "n_zocalo_sw": [-98.1990, 19.0428],
        "n_catedral_s": [-98.1983, 19.0428],
        "n_palafox_5ote": [-98.1991, 19.0424],
        "n_amparo_2sur": [-98.1998, 19.0416],
        "n_rosario_5mayo": [-98.1993, 19.0453],
        "n_sapos_6sur": [-98.1963, 19.0411],
        "n_puente_ovando": [-98.1945, 19.0415],
        "n_analco_parque_w": [-98.1925, 19.0418],
        "n_analco_parque_e": [-98.1920, 19.0418],
        "n_analco_calle7ote": [-98.1918, 19.0415],
        "n_analco_5ote": [-98.1931, 19.0425],
        "n_luz_palafox": [-98.1915, 19.0441],
        "n_luz_horno": [-98.1905, 19.0441],
        "n_luz_templo": [-98.1912, 19.0446],
        "n_san_francisco_jardin": [-98.1928, 19.0457],
        "n_alto_mercado": [-98.1916, 19.0468],
        "n_xane_concordia": [-98.1910, 19.0480],
        "n_xane_calle4norte": [-98.1901, 19.0492],
        "n_xane_antojeria": [-98.1908, 19.0485],
        # Nodos de expansion (POIs 15 al 24)
        "n_munecos_2norte": [-98.1972, 19.0439],
        "n_dulces_6ote": [-98.1968, 19.0451],
        "n_alfenique_4ote": [-98.1949, 19.0445],
        "n_parian_6norte": [-98.1942, 19.0442],
        "n_bubas_puente": [-98.1924, 19.0429],
        "n_analco_vidrio": [-98.1922, 19.0406],
        "n_analco_panaderia": [-98.1912, 19.0421],
        "n_luz_cazuelas": [-98.1882, 19.0426],
        "n_sanfco_templo": [-98.1895, 19.0449],
        "n_xane_mirador": [-98.1894, 19.0504],
        # Nodos de expansion (POIs 25 al 34)
        "n_barrio_artistas": [-98.1945, 19.0435],
        "n_callejon_sapos": [-98.1965, 19.0405],
        "n_teatro_principal": [-98.1940, 19.0448],
        "n_san_pedro_museo": [-98.1952, 19.0440],
        "n_santa_monica": [-98.1989, 19.0490],
        "n_parroquia_san_jose": [-98.1950, 19.0485],
        "n_fuente_san_miguel": [-98.1978, 19.0433],
        "n_mesonde_san_roque": [-98.1955, 19.0455],
        "n_taller_hojalata_analco": [-98.1925, 19.0418],
        "n_horno_pan_xanenetla": [-98.1932, 19.0475]
    }

    # Asociar cada POI a su nodo de acceso mas cercano
    poi_access_node = {
        "poi_catedral": "n_catedral_s",
        "poi_palafoxiana": "n_palafox_5ote",
        "poi_amparo": "n_amparo_2sur",
        "poi_capilla_rosario": "n_rosario_5mayo",
        "poi_sapo_antiguedades": "n_sapos_6sur",
        "poi_parque_analco": "n_analco_parque_w",
        "poi_templo_analco": "n_analco_calle7ote",
        "poi_taller_talavera_analco": "n_analco_5ote",
        "poi_horno_la_luz": "n_luz_horno",
        "poi_templo_la_luz": "n_luz_templo",
        "poi_mercado_el_alto": "n_alto_mercado",
        "poi_casa_aguada": "n_san_francisco_jardin",
        "poi_ciudad_mural": "n_xane_calle4norte",
        "poi_antojeria_xanenetla": "n_xane_antojeria",
        "poi_casa_munecos": "n_munecos_2norte",
        "poi_calle_dulces": "n_dulces_6ote",
        "poi_casa_alfenique": "n_alfenique_4ote",
        "poi_mercado_parian": "n_parian_6norte",
        "poi_puente_bubas": "n_bubas_puente",
        "poi_taller_vidrio_analco": "n_analco_vidrio",
        "poi_panaderia_horno_analco": "n_analco_panaderia",
        "poi_alfareria_cazuelas_luz": "n_luz_cazuelas",
        "poi_templo_san_francisco": "n_sanfco_templo",
        "poi_mirador_mural_xanenetla": "n_xane_mirador",
        "poi_barrio_artistas": "n_barrio_artistas",
        "poi_callejon_sapos": "n_callejon_sapos",
        "poi_teatro_principal": "n_teatro_principal",
        "poi_san_pedro_museo": "n_san_pedro_museo",
        "poi_santa_monica": "n_santa_monica",
        "poi_parroquia_san_jose": "n_parroquia_san_jose",
        "poi_fuente_san_miguel": "n_fuente_san_miguel",
        "poi_mesonde_san_roque": "n_mesonde_san_roque",
        "poi_taller_hojalata_analco": "n_taller_hojalata_analco",
        "poi_horno_pan_xanenetla": "n_horno_pan_xanenetla"
    }

    # Definir conexiones viales (con tramos por lado y cruces)
    # Estructura de definicion de tramo de banqueta
    street_definitions = [
        # Zocalo - Catedral (trazo perimetral ortogonal sin cruzar la nave de Catedral)
        ("seg_zocalo_16sep_e", "n_zocalo_ne", "n_catedral_s", "right", "zocalo_centro_nucleo", 1.90, 1.2, "laja_colonial_nivelada", True, False),
        ("seg_zocalo_16sep_w", "n_zocalo_nw", "n_zocalo_sw", "left", "zocalo_centro_nucleo", 1.60, 1.0, "laja_colonial", True, False),
        ("seg_zocalo_sur_conn", "n_zocalo_sw", "n_catedral_s", "crossing", "zocalo_centro_nucleo", 2.00, 0.5, "concreto", True, False),
        ("seg_zocalo_norte_conn", "n_zocalo_nw", "n_zocalo_ne", "crossing", "zocalo_centro_nucleo", 2.00, 0.5, "concreto", True, False),
        ("seg_fuente_san_miguel", "n_catedral_s", "n_fuente_san_miguel", "crossing", "zocalo_centro_nucleo", 2.20, 0.5, "laja_colonial_nivelada", True, False),
        ("seg_fuente_zocalo_ne", "n_fuente_san_miguel", "n_zocalo_ne", "crossing", "zocalo_centro_nucleo", 2.20, 0.5, "laja_colonial_nivelada", True, False),
        # Hacia Palafoxiana
        ("seg_palafox_5ote_s", "n_catedral_s", "n_palafox_5ote", "right", "zocalo_centro_nucleo", 1.55, 1.8, "laja_colonial", True, False),
        ("seg_palafox_5ote_n", "n_zocalo_se", "n_palafox_5ote", "left", "zocalo_centro_nucleo", 1.20, 2.1, "concreto", False, False),
        # Hacia Museo Amparo
        ("seg_amparo_2sur_w", "n_palafox_5ote", "n_amparo_2sur", "left", "zocalo_centro_nucleo", 1.40, 2.5, "laja_colonial", True, False),
        ("seg_amparo_2sur_e", "n_palafox_5ote", "n_amparo_2sur", "right", "zocalo_centro_nucleo", 1.35, 2.4, "laja_colonial", True, False),
        # Hacia Capilla del Rosario y Santa Monica
        ("seg_rosario_5mayo_w", "n_zocalo_nw", "n_rosario_5mayo", "left", "zocalo_centro_nucleo", 1.80, 0.8, "adoquin_asentado", True, False),
        ("seg_rosario_5mayo_e", "n_zocalo_ne", "n_rosario_5mayo", "right", "zocalo_centro_nucleo", 1.70, 0.9, "adoquin_asentado", True, False),
        ("seg_santa_monica_5mayo", "n_rosario_5mayo", "n_santa_monica", "left", "zocalo_centro_nucleo", 1.65, 1.4, "adoquin_asentado", True, False),
        # Hacia Los Sapos y Callejon
        ("seg_sapos_6sur_w", "n_palafox_5ote", "n_sapos_6sur", "left", "zocalo_centro_nucleo", 1.10, 3.2, "laja_colonial", False, False),
        ("seg_sapos_6sur_e", "n_catedral_s", "n_sapos_6sur", "right", "zocalo_centro_nucleo", 1.25, 2.8, "laja_colonial", True, False),
        ("seg_callejon_sapos", "n_sapos_6sur", "n_callejon_sapos", "right", "zocalo_centro_nucleo", 1.50, 1.5, "laja_colonial_nivelada", True, False),
        # Conexion Zocalo / Sapos hacia Analco por Puente de Ovando
        ("seg_ovando_puente", "n_sapos_6sur", "n_puente_ovando", "crossing", "barrio_analco", 1.30, 4.0, "laja_colonial", True, False),
        ("seg_ovando_a_analco", "n_puente_ovando", "n_analco_parque_w", "crossing", "barrio_analco", 1.50, 2.0, "adoquin_asentado", True, False),
        # Barrio de Analco
        ("seg_analco_parque_w", "n_analco_parque_w", "n_analco_parque_e", "right", "barrio_analco", 1.60, 1.5, "adoquin_asentado", True, False),
        ("seg_analco_hojalata", "n_analco_parque_w", "n_taller_hojalata_analco", "right", "barrio_analco", 1.55, 1.2, "adoquin_asentado", True, False),
        ("seg_analco_calle7ote_s", "n_analco_parque_e", "n_analco_calle7ote", "right", "barrio_analco", 0.75, 2.2, "concreto", False, True),  # Barrera: escalon
        ("seg_analco_taller_5ote", "n_analco_parque_w", "n_analco_5ote", "left", "barrio_analco", 1.25, 1.8, "adoquin_asentado", True, False),
        ("seg_analco_conn_norte", "n_analco_5ote", "n_luz_palafox", "crossing", "barrio_analco", 1.30, 2.0, "concreto", True, False),
        # Barrio de La Luz
        ("seg_luz_palafox_s", "n_luz_palafox", "n_luz_horno", "right", "barrio_la_luz", 0.85, 3.5, "laja_colonial", False, False),
        ("seg_luz_palafox_n", "n_luz_palafox", "n_luz_templo", "left", "barrio_la_luz", 1.30, 2.8, "concreto", True, False),
        ("seg_luz_horno_acceso", "n_luz_templo", "n_luz_horno", "crossing", "barrio_la_luz", 0.95, 4.5, "empedrado", False, True),  # Barrera: escalon 20cm
        ("seg_luz_a_sanfco", "n_luz_templo", "n_san_francisco_jardin", "crossing", "barrio_el_alto", 1.50, 2.0, "adoquin_asentado", True, False),
        # Barrio de El Alto
        ("seg_alto_sanfco_jardin", "n_san_francisco_jardin", "n_alto_mercado", "right", "barrio_el_alto", 1.70, 1.2, "adoquin_asentado", True, False),
        ("seg_alto_mercado_14norte", "n_alto_mercado", "n_xane_concordia", "left", "barrio_el_alto", 1.40, 2.0, "concreto", True, False),
        # Barrio de Xanenetla
        ("seg_xane_concordia_norte", "n_xane_concordia", "n_xane_calle4norte", "right", "barrio_xanenetla", 1.30, 3.8, "concreto", True, False),
        ("seg_xane_calle4norte_w", "n_xane_calle4norte", "n_xane_antojeria", "left", "barrio_xanenetla", 1.15, 4.2, "adoquin", True, False),
        ("seg_xane_callejuela_empedrada", "n_xane_concordia", "n_xane_antojeria", "right", "barrio_xanenetla", 0.80, 6.5, "empedrado_desprendido", False, True), # Barrera
        ("seg_xane_horno_pan", "n_xane_concordia", "n_horno_pan_xanenetla", "left", "barrio_xanenetla", 1.35, 2.6, "adoquin_asentado", True, False),
        # Expansion Centro / Barrios
        ("seg_munecos_2norte", "n_zocalo_ne", "n_munecos_2norte", "right", "zocalo_centro_nucleo", 1.80, 1.0, "laja_colonial_nivelada", True, False),
        ("seg_dulces_6ote", "n_munecos_2norte", "n_dulces_6ote", "left", "zocalo_centro_nucleo", 1.50, 1.2, "laja_colonial", True, False),
        ("seg_dulces_rosario", "n_rosario_5mayo", "n_dulces_6ote", "crossing", "zocalo_centro_nucleo", 1.60, 1.0, "adoquin_asentado", True, False),
        ("seg_san_pedro_4norte", "n_dulces_6ote", "n_san_pedro_museo", "right", "zocalo_centro_nucleo", 1.65, 1.2, "laja_colonial_nivelada", True, False),
        ("seg_san_roque_parian", "n_san_pedro_museo", "n_mesonde_san_roque", "left", "zocalo_centro_nucleo", 1.50, 1.5, "laja_colonial", True, False),
        ("seg_san_jose_norte", "n_mesonde_san_roque", "n_parroquia_san_jose", "right", "barrio_el_alto", 1.60, 1.8, "adoquin_asentado", True, False),
        ("seg_alfenique_4ote", "n_munecos_2norte", "n_alfenique_4ote", "right", "zocalo_centro_nucleo", 1.40, 1.5, "laja_colonial", True, False),
        ("seg_parian_6norte", "n_alfenique_4ote", "n_parian_6norte", "crossing", "zocalo_centro_nucleo", 1.70, 1.0, "adoquin_asentado", True, False),
        ("seg_barrio_artistas_parian", "n_parian_6norte", "n_barrio_artistas", "right", "zocalo_centro_nucleo", 1.75, 1.0, "laja_colonial_nivelada", True, False),
        ("seg_teatro_principal_8norte", "n_parian_6norte", "n_teatro_principal", "left", "barrio_el_alto", 1.65, 1.4, "laja_colonial_nivelada", True, False),
        ("seg_teatro_a_sanfco", "n_teatro_principal", "n_san_francisco_jardin", "crossing", "barrio_el_alto", 1.60, 1.8, "adoquin_asentado", True, False),
        ("seg_parian_bubas", "n_parian_6norte", "n_bubas_puente", "crossing", "barrio_analco", 1.40, 2.5, "laja_colonial", True, False),
        ("seg_bubas_analco", "n_bubas_puente", "n_analco_5ote", "crossing", "barrio_analco", 1.30, 3.0, "laja_colonial", True, False),
        ("seg_analco_vidrio", "n_analco_parque_w", "n_analco_vidrio", "left", "barrio_analco", 1.20, 2.0, "adoquin_asentado", True, False),
        ("seg_analco_panaderia", "n_analco_parque_e", "n_analco_panaderia", "right", "barrio_analco", 1.25, 1.8, "adoquin_asentado", True, False),
        ("seg_luz_cazuelas", "n_luz_horno", "n_luz_cazuelas", "right", "barrio_la_luz", 1.10, 3.0, "concreto", True, False),
        ("seg_luz_cazuelas_templo", "n_luz_templo", "n_luz_cazuelas", "left", "barrio_la_luz", 1.30, 2.5, "concreto", True, False),
        ("seg_sanfco_templo", "n_san_francisco_jardin", "n_sanfco_templo", "crossing", "barrio_el_alto", 1.80, 1.0, "adoquin_asentado", True, False),
        ("seg_xane_mirador", "n_xane_calle4norte", "n_xane_mirador", "right", "barrio_xanenetla", 1.00, 7.5, "empedrado", False, True) # Barrera: subida con escalones
    ]

    # Waypoints ortogonales explicitos para que ningun tramo corte manzanas o la Catedral en diagonal
    segment_waypoints = {
        "seg_zocalo_16sep_e": [[-98.1975, 19.0428]],
        "seg_palafox_5ote_s": [[-98.1983, 19.0424]],
        "seg_palafox_5ote_n": [[-98.1983, 19.0424]],
        "seg_amparo_2sur_w": [[-98.1991, 19.0416]],
        "seg_amparo_2sur_e": [[-98.1998, 19.0424]],
        "seg_rosario_5mayo_e": [[-98.1990, 19.0435], [-98.1993, 19.0435]],
        "seg_sapos_6sur_w": [[-98.1963, 19.0424]],
        "seg_sapos_6sur_e": [[-98.1975, 19.0428], [-98.1975, 19.0411]],
        "seg_ovando_puente": [[-98.1945, 19.0411]],
        "seg_ovando_a_analco": [[-98.1930, 19.0415]],
        "seg_analco_conn_norte": [[-98.1931, 19.0441]],
        "seg_luz_a_sanfco": [[-98.1912, 19.0457]],
        "seg_alto_sanfco_jardin": [[-98.1916, 19.0457]],
        "seg_dulces_rosario": [[-98.1993, 19.0451]],
        "seg_alfenique_4ote": [[-98.1972, 19.0445]],
        "seg_parian_bubas": [[-98.1942, 19.0429]],
        "seg_bubas_analco": [[-98.1931, 19.0429]],
        "seg_luz_cazuelas": [[-98.1882, 19.0441]],
        "seg_luz_cazuelas_templo": [[-98.1895, 19.0446], [-98.1895, 19.0426]],
        "seg_sanfco_templo": [[-98.1895, 19.0457]],
        "seg_san_pedro_4norte": [[-98.1952, 19.0451]],
        "seg_san_jose_norte": [[-98.1950, 19.0455]],
        "seg_xane_horno_pan": [[-98.1932, 19.0480]]
    }

    def build_street_polyline(sid, coord_u, coord_v):
        if sid in segment_waypoints:
            return [coord_u, *segment_waypoints[sid], coord_v]
        dlon = abs(coord_u[0] - coord_v[0])
        dlat = abs(coord_u[1] - coord_v[1])
        if dlon > 0.00035 and dlat > 0.00035:
            # Codo ortogonal siguiendo la traza en damero
            corner = [round(coord_v[0], 5), round(coord_u[1], 5)]
            return [coord_u, corner, coord_v]
        return [coord_u, coord_v]

    def polyline_length(coords):
        total = 0.0
        for idx in range(len(coords) - 1):
            total += distance_haversine(coords[idx], coords[idx + 1])
        return round(total, 1)

    segments = []
    geojson_features = []

    for sid, u, v, side, zone, width, slope, surface, curb_ramp, has_steps in street_definitions:
        coord_u = base_nodes[u]
        coord_v = base_nodes[v]
        poly_coords = build_street_polyline(sid, coord_u, coord_v)
        length = max(10.0, polyline_length(poly_coords))

        audits = audits_by_segment.get(sid, [])
        confidence, count, is_verified = compute_audit_confidence(audits, thresholds_cfg)

        # Reglas de transitabilidad funcional segun perfil (leidas de config)
        transitable, _causes = evaluate_transitability(width, slope, surface, curb_ramp, has_steps, thresholds_cfg)

        # Cumplimiento normativo: solo se evalua donde config tiene parametro medible.
        # Toda la zona piloto esta dentro de la Zona de Monumentos, por eso se usa el valor de zonas historicas.
        nom004 = thresholds_cfg["nivel_1_cumplimiento_normativo"]["NOM_004_SEDATU_2023"]["parametros"]
        franja_hist = nom004["franja_circulacion_peatonal_zonas_historicas_metros"]["valor_preliminar"]
        rampa_max = nom004["pendiente_longitudinal_rampas_porcentaje"]["rango_preliminar"][1]
        compliance_norm = {
            "nom_001_sedatu": None,
            "nom_004_sedatu": width >= franja_hist and curb_ramp and slope <= rampa_max and not has_steps,
            "ntdiu_puebla": None,
            "estado_verificacion": "por_verificar_contra_dof"
        }

        seg_data = {
            "id": sid,
            "osm_way_id": f"osm_{sid}",
            "side": side,
            "from_node": u,
            "to_node": v,
            "geometry": {
                "type": "LineString",
                "coordinates": poly_coords
            },
            "length_m": length,
            "zone": zone,
            "slope_pct": slope,
            "width_m": width,
            "surface": surface,
            "has_curb_ramp": curb_ramp,
            "has_steps": has_steps,
            "transitable": transitable,
            "compliance_norm": compliance_norm,
            "confidence": confidence,
            "audit_count": count,
            "is_verified": is_verified
        }
        segments.append(seg_data)

        # Feature GeoJSON
        geojson_features.append({
            "type": "Feature",
            "geometry": seg_data["geometry"],
            "properties": {
                "id": sid,
                "zone": zone,
                "length_m": length,
                "width_m": width,
                "slope_pct": slope,
                "surface": surface,
                "confidence": confidence,
                "is_verified": is_verified,
                "transitable_sin_restriccion": transitable["sin_restriccion"],
                "transitable_movilidad_reducida": transitable["movilidad_reducida"],
                "transitable_silla_de_ruedas": transitable["silla_de_ruedas"],
                "has_steps": has_steps,
                "has_curb_ramp": curb_ramp
            }
        })

    # Guardar GeoJSON de segmentos de accesibilidad
    geojson_out = {
        "type": "FeatureCollection",
        "features": geojson_features
    }
    processed_dir = os.path.join(root_dir, "data", "processed")
    os.makedirs(processed_dir, exist_ok=True)

    with open(os.path.join(processed_dir, "accessibility_segments.geojson"), "w", encoding="utf-8") as f:
        json.dump(geojson_out, f, indent=2, ensure_ascii=False)

    # Guardar Grafo de aceras
    graph_out = {
        "nodes": {nid: {"id": nid, "coordinates": coords} for nid, coords in base_nodes.items()},
        "edges": segments
    }
    with open(os.path.join(processed_dir, "sidewalk_graph.json"), "w", encoding="utf-8") as f:
        json.dump(graph_out, f, indent=2, ensure_ascii=False)

    # Guardar POIs normalizados
    with open(os.path.join(processed_dir, "pois.json"), "w", encoding="utf-8") as f:
        json.dump(pois, f, indent=2, ensure_ascii=False)

    # Calculo de matrices de distancia y tiempo entre todos los POIs por perfil
    # Velocidad peatonal promedio base: 4.2 km/h = 70 metros / minuto
    speed_m_per_min = 70.0
    profiles = ["sin_restriccion", "movilidad_reducida", "silla_de_ruedas"]
    poi_ids = [p["id"] for p in pois]
    num_pois = len(poi_ids)

    # Construir grafo de adyacencia bidireccional para ruteo
    adj_by_profile = {p: {} for p in profiles}
    for p in profiles:
        for node in base_nodes:
            adj_by_profile[p][node] = []
        for s in segments:
            if s["transitable"][p]:
                u, v, l = s["from_node"], s["to_node"], s["length_m"]
                sid = s["id"]
                # Las aceras permiten flujo peatonal en ambos sentidos a menos que se restrinja
                adj_by_profile[p][u].append((v, l, sid))
                adj_by_profile[p][v].append((u, l, sid))

    # Algoritmo de Dijkstra para calcular caminos minimos
    import heapq

    def dijkstra(adj, start_node):
        dist = {node: float("inf") for node in base_nodes}
        parent = {node: None for node in base_nodes}
        edge_used = {node: None for node in base_nodes}
        dist[start_node] = 0.0
        pq = [(0.0, start_node)]

        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, length, sid in adj[u]:
                if dist[u] + length < dist[v]:
                    dist[v] = dist[u] + length
                    parent[v] = u
                    edge_used[v] = sid
                    heapq.heappush(pq, (dist[v], v))

        return dist, parent, edge_used

    def reconstruct_path_edges(parent, edge_used, start_node, end_node):
        if start_node == end_node:
            return []
        path = []
        curr = end_node
        while curr != start_node and curr is not None:
            e = edge_used[curr]
            if e:
                path.append(e)
            curr = parent[curr]
        path.reverse()
        return path

    time_matrices_out = {
        "poi_ids": poi_ids,
        "profiles": {}
    }

    for prof in profiles:
        adj = adj_by_profile[prof]
        dist_mat = [[0.0 for _ in range(num_pois)] for _ in range(num_pois)]
        time_mat = [[0.0 for _ in range(num_pois)] for _ in range(num_pois)]
        path_mat = [[[] for _ in range(num_pois)] for _ in range(num_pois)]

        for i, id_i in enumerate(poi_ids):
            node_i = poi_access_node[id_i]
            dists, parents, edges_used = dijkstra(adj, node_i)

            for j, id_j in enumerate(poi_ids):
                if i == j:
                    dist_mat[i][j] = 0.0
                    time_mat[i][j] = 0.0
                    path_mat[i][j] = []
                else:
                    node_j = poi_access_node[id_j]
                    d_meters = dists[node_j]
                    if math.isinf(d_meters):
                        dist_mat[i][j] = 999999.0
                        time_mat[i][j] = 999999.0
                        path_mat[i][j] = []
                    else:
                        dist_mat[i][j] = round(d_meters, 1)
                        # Tiempo caminado en minutos
                        time_mat[i][j] = round(d_meters / speed_m_per_min, 1)
                        path_mat[i][j] = reconstruct_path_edges(parents, edges_used, node_i, node_j)

        time_matrices_out["profiles"][prof] = {
            "distance_meters": dist_mat,
            "time_minutes": time_mat,
            "path_segments": path_mat
        }

    with open(os.path.join(processed_dir, "time_matrices.json"), "w", encoding="utf-8") as f:
        json.dump(time_matrices_out, f, indent=2, ensure_ascii=False)

    barrier_ranking = compute_barrier_ranking(
        segments, list(base_nodes.keys()), poi_access_node, pois, "poi_catedral", thresholds_cfg
    )
    with open(os.path.join(processed_dir, "barrier_ranking.json"), "w", encoding="utf-8") as f:
        json.dump(barrier_ranking, f, indent=2, ensure_ascii=False)

    print(f"Pipeline completado con exito:")
    print(f"- Segmentos generados: {len(segments)}")
    print(f"- POIs procesados: {len(pois)}")
    print(f"- Matrices generadas para {len(profiles)} perfiles.")

if __name__ == "__main__":
    main()
