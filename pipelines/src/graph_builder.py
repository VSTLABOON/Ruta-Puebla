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
        "n_zocalo_nw": [-98.198969, 19.043553],
        "n_zocalo_ne": [-98.197454, 19.043477],
        "n_zocalo_se": [-98.197466, 19.04286],
        "n_zocalo_sw": [-98.198565, 19.043419],
        "n_catedral_s": [-98.19808, 19.04318],
        "n_palafox_5ote": [-98.19897, 19.042629],
        "n_amparo_2sur": [-98.200173, 19.041799],
        "n_rosario_5mayo": [-98.19908, 19.045677],
        "n_sapos_6sur": [-98.196242, 19.041193],
        "n_puente_ovando": [-98.194681, 19.04135],
        "n_analco_parque_w": [-98.192571, 19.041819],
        "n_analco_parque_e": [-98.191911, 19.041947],
        "n_analco_calle7ote": [-98.191624, 19.041791],
        "n_analco_5ote": [-98.193069, 19.042554],
        "n_luz_palafox": [-98.191906, 19.043866],
        "n_luz_horno": [-98.191353, 19.043051],
        "n_luz_templo": [-98.191565, 19.044787],
        "n_san_francisco_jardin": [-98.192911, 19.045504],
        "n_alto_mercado": [-98.191661, 19.046708],
        "n_xane_concordia": [-98.191018, 19.047966],
        "n_xane_calle4norte": [-98.190107, 19.049188],
        "n_xane_antojeria": [-98.190692, 19.048444],
        "n_munecos_2norte": [-98.197072, 19.043829],
        "n_dulces_6ote": [-98.196629, 19.045397],
        "n_alfenique_4ote": [-98.194898, 19.044503],
        "n_parian_6norte": [-98.194214, 19.044176],
        "n_bubas_puente": [-98.192352, 19.042891],
        "n_analco_vidrio": [-98.192375, 19.040264],
        "n_analco_panaderia": [-98.191174, 19.042148],
        "n_luz_cazuelas": [-98.188168, 19.042445],
        "n_sanfco_templo": [-98.189451, 19.045207],
        "n_xane_mirador": [-98.189402, 19.050398],
        "n_barrio_artistas": [-98.194589, 19.043349],
        "n_callejon_sapos": [-98.196555, 19.040596],
        "n_teatro_principal": [-98.193892, 19.044989],
        "n_san_pedro_museo": [-98.19504, 19.043917],
        "n_santa_monica": [-98.199097, 19.048665],
        "n_parroquia_san_jose": [-98.194992, 19.048514],
        "n_fuente_san_miguel": [-98.197779, 19.043314],
        "n_mesonde_san_roque": [-98.195363, 19.04574],
        "n_taller_hojalata_analco": [-98.19263, 19.041618],
        "n_horno_pan_xanenetla": [-98.193157, 19.047576]
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
        ("seg_analco_vidrio", "n_analco_parque_w", "n_analco_vidrio", "left", "barrio_analco", 1.20, 2.0, "adoquin_asentado", True, False),
        ("seg_analco_panaderia", "n_analco_parque_e", "n_analco_panaderia", "right", "barrio_analco", 1.25, 1.8, "adoquin_asentado", True, False),
        ("seg_analco_12sur_7a9", "n_analco_calle7ote", "n_analco_vidrio", "right", "barrio_analco", 1.40, 1.8, "adoquin_asentado", True, False),
        ("seg_analco_14sur_5a7", "n_analco_panaderia", "n_analco_calle7ote", "left", "barrio_analco", 1.35, 1.5, "adoquin_asentado", True, False),
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
        ("seg_luz_cazuelas", "n_luz_horno", "n_luz_cazuelas", "right", "barrio_la_luz", 1.10, 3.0, "concreto", True, False),
        ("seg_luz_cazuelas_templo", "n_luz_templo", "n_luz_cazuelas", "left", "barrio_la_luz", 1.30, 2.5, "concreto", True, False),
        ("seg_sanfco_templo", "n_san_francisco_jardin", "n_sanfco_templo", "crossing", "barrio_el_alto", 1.80, 1.0, "adoquin_asentado", True, False),
        ("seg_xane_mirador", "n_xane_calle4norte", "n_xane_mirador", "right", "barrio_xanenetla", 1.00, 7.5, "empedrado", False, True) # Barrera: subida con escalones
    ]

    # Waypoints ortogonales explicitos para que ningun tramo corte manzanas o la Catedral en diagonal
    segment_waypoints = {
        "seg_zocalo_16sep_e": [[-98.197658, 19.043136], [-98.197629, 19.043092], [-98.19759, 19.043127], [-98.197647, 19.042963], [-98.197782, 19.04304], [-98.197773, 19.043031], [-98.197773, 19.04304], [-98.197775, 19.043049], [-98.19778, 19.043057], [-98.197787, 19.043064], [-98.197795, 19.043068], [-98.197805, 19.04307], [-98.197815, 19.043069], [-98.197824, 19.043066], [-98.197831, 19.043061], [-98.197818, 19.043059], [-98.198019, 19.043164], [-98.19804, 19.043157], [-98.198042, 19.043156], [-98.198044, 19.043155], [-98.198046, 19.043156], [-98.198047, 19.043157], [-98.198049, 19.043159], [-98.19805, 19.043161], [-98.19805, 19.043162], [-98.198052, 19.043179]],
        "seg_zocalo_16sep_w": [[-98.199047, 19.043578], [-98.19907, 19.043609], [-98.198976, 19.043662], [-98.198729, 19.043535], [-98.198725, 19.043514], [-98.198724, 19.043513], [-98.198724, 19.043511], [-98.198722, 19.043509], [-98.19872, 19.043508], [-98.198718, 19.043507], [-98.198718, 19.043507], [-98.198715, 19.043509], [-98.198695, 19.043516], [-98.198556, 19.043444], [-98.198551, 19.043424]],
        "seg_zocalo_sur_conn": [[-98.198562, 19.043414], [-98.198558, 19.043409], [-98.198552, 19.043406], [-98.198545, 19.043405], [-98.198538, 19.043406], [-98.198532, 19.043409], [-98.198528, 19.043414], [-98.198305, 19.043297]],
        "seg_zocalo_norte_conn": [[-98.19904, 19.04359], [-98.19906, 19.0436], [-98.198979, 19.043649], [-98.198942, 19.043663], [-98.198876, 19.043728], [-98.198871, 19.0437], [-98.198866, 19.043671], [-98.198348, 19.043417], [-98.198264, 19.043375], [-98.198178, 19.043334], [-98.197665, 19.04309], [-98.197628, 19.043105], [-98.197645, 19.043131]],
        "seg_fuente_san_miguel": [[-98.198062, 19.04317], [-98.198064, 19.043164], [-98.198064, 19.043158], [-98.198061, 19.043152], [-98.198057, 19.043147], [-98.198051, 19.043143], [-98.198044, 19.043142], [-98.198037, 19.043143], [-98.198031, 19.043147], [-98.198026, 19.043152], [-98.197825, 19.043047], [-98.197821, 19.043051], [-98.197817, 19.043054], [-98.197811, 19.043056], [-98.197806, 19.043057], [-98.1978, 19.043055], [-98.197795, 19.043053], [-98.197791, 19.043049], [-98.197788, 19.043044], [-98.197787, 19.043039], [-98.197787, 19.043033], [-98.197789, 19.043028], [-98.197641, 19.042951], [-98.197576, 19.043126], [-98.197628, 19.043105], [-98.197645, 19.043131]],
        "seg_fuente_zocalo_ne": [[-98.197645, 19.043131]],
        "seg_palafox_5ote_s": [[-98.198072, 19.043161], [-98.198078, 19.043166], [-98.198078, 19.043155], [-98.198073, 19.043145], [-98.198067, 19.043137], [-98.198056, 19.04313], [-98.198044, 19.043129], [-98.198032, 19.04313], [-98.198022, 19.043137], [-98.198033, 19.04314], [-98.197832, 19.043035], [-98.197811, 19.043041], [-98.19781, 19.043042], [-98.197807, 19.043043], [-98.197807, 19.043044], [-98.197805, 19.043042], [-98.197803, 19.043042], [-98.197802, 19.043041], [-98.197801, 19.043039], [-98.197801, 19.043038], [-98.197801, 19.043035], [-98.197796, 19.043016], [-98.197648, 19.042939], [-98.19761, 19.042923], [-98.197622, 19.04287], [-98.197647, 19.04281], [-98.198012, 19.042153], [-98.198605, 19.042459]],
        "seg_palafox_5ote_n": [[-98.197562, 19.042893], [-98.197588, 19.042917], [-98.197594, 19.042862], [-98.197621, 19.042798], [-98.198002, 19.042127], [-98.198619, 19.042435]],
        "seg_amparo_2sur_w": [[-98.199516, 19.042897], [-98.199917, 19.042202], [-98.199923, 19.042191], [-98.199945, 19.042154]],
        "seg_amparo_2sur_e": [[-98.199528, 19.042921], [-98.199941, 19.042216], [-98.199947, 19.042205], [-98.199969, 19.042168]],
        "seg_rosario_5mayo_w": [[-98.199047, 19.043578], [-98.19907, 19.043609], [-98.198993, 19.043649], [-98.199074, 19.043694], [-98.198978, 19.043726], [-98.198632, 19.044266], [-98.198597, 19.044312], [-98.198627, 19.044335], [-98.19863, 19.044351], [-98.198631, 19.044358], [-98.198633, 19.044359], [-98.198646, 19.044371], [-98.198669, 19.044383], [-98.19866, 19.04441], [-98.198677, 19.04442], [-98.198669, 19.044459], [-98.198636, 19.044514], [-98.198235, 19.045188], [-98.198208, 19.045206]],
        "seg_rosario_5mayo_e": [[-98.197356, 19.043647], [-98.197862, 19.043897], [-98.197834, 19.04394], [-98.197935, 19.043992], [-98.197917, 19.044004], [-98.197914, 19.04404], [-98.198519, 19.044361], [-98.19856, 19.044382], [-98.198588, 19.044401], [-98.198643, 19.044455], [-98.198612, 19.0445], [-98.198211, 19.045174], [-98.198194, 19.04523]],
        "seg_santa_monica_5mayo": [[-98.199701, 19.045992], [-98.199252, 19.046752], [-98.199238, 19.046774], [-98.198798, 19.047513], [-98.198349, 19.048262]],
        "seg_sapos_6sur_w": [[-98.198605, 19.042459], [-98.198, 19.042152], [-98.196543, 19.041376], [-98.196532, 19.04137]],
        "seg_sapos_6sur_e": [[-98.198072, 19.043161], [-98.198078, 19.043166], [-98.198078, 19.043155], [-98.198073, 19.043145], [-98.198067, 19.043137], [-98.198056, 19.04313], [-98.198044, 19.043129], [-98.198032, 19.04313], [-98.198022, 19.043137], [-98.198033, 19.04314], [-98.197832, 19.043035], [-98.197811, 19.043041], [-98.19781, 19.043042], [-98.197807, 19.043043], [-98.197807, 19.043044], [-98.197805, 19.043042], [-98.197803, 19.043042], [-98.197802, 19.043041], [-98.197801, 19.043039], [-98.197801, 19.043038], [-98.197801, 19.043035], [-98.197796, 19.043016], [-98.197648, 19.042939], [-98.19761, 19.042923], [-98.197622, 19.04287], [-98.197647, 19.04281], [-98.198019, 19.042132], [-98.196557, 19.041352], [-98.196546, 19.041346]],
        "seg_callejon_sapos": [[-98.196016, 19.041052], [-98.196082, 19.04103], [-98.196362, 19.040844], [-98.196363, 19.040821], [-98.196363, 19.040813], [-98.196365, 19.040808], [-98.196371, 19.040801], [-98.196385, 19.04078], [-98.196357, 19.040735], [-98.196338, 19.040721], [-98.196407, 19.040686]],
        "seg_ovando_puente": [[-98.196005, 19.041061], [-98.195059, 19.041623], [-98.194826, 19.041501]],
        "seg_ovando_a_analco": [[-98.194431, 19.041089], [-98.194022, 19.040718], [-98.19383, 19.040873], [-98.193461, 19.041189], [-98.193042, 19.041574], [-98.192994, 19.04155], [-98.192731, 19.041416], [-98.192695, 19.041396]],
        "seg_analco_parque_w": [[-98.192549, 19.041841], [-98.192521, 19.041919], [-98.1924, 19.042199]],
        "seg_analco_hojalata": [[-98.192614, 19.041722]],
        "seg_analco_calle7ote_s": [[-98.191768, 19.041854]],
        "seg_analco_taller_5ote": [[-98.192577, 19.041849], [-98.192547, 19.041929], [-98.192415, 19.042215], [-98.192456, 19.042224], [-98.192524, 19.04226], [-98.192573, 19.042284]],
        "seg_analco_conn_norte": [[-98.192566, 19.042296], [-98.192439, 19.042556], [-98.192401, 19.042665], [-98.192352, 19.042891], [-98.192294, 19.043159], [-98.192288, 19.043186], [-98.192233, 19.043167], [-98.192174, 19.043149], [-98.192099, 19.043126], [-98.191913, 19.043843]],
        "seg_analco_vidrio": [[-98.192681, 19.041392], [-98.192714, 19.041303], [-98.192736, 19.041248], [-98.192736, 19.041027], [-98.192742, 19.040983], [-98.192749, 19.040934], [-98.192819, 19.040597], [-98.192819, 19.040576], [-98.192816, 19.040555], [-98.192812, 19.040539], [-98.192792, 19.040496], [-98.192761, 19.040469], [-98.192723, 19.040442]],
        "seg_analco_panaderia": [[-98.191768, 19.041854], [-98.191571, 19.041758], [-98.191314, 19.042211]],
        "seg_analco_12sur_7a9": [[-98.19158, 19.041768], [-98.191043, 19.041486], [-98.191507, 19.040734], [-98.191899, 19.040043]],
        "seg_analco_14sur_5a7": [[-98.191314, 19.042211], [-98.191568, 19.041761]],
        "seg_luz_palafox_s": [[-98.191927, 19.043846], [-98.192113, 19.043127], [-98.191991, 19.043063], [-98.191895, 19.043023], [-98.191808, 19.042998], [-98.19175, 19.042972], [-98.191678, 19.042961], [-98.191642, 19.042973], [-98.191497, 19.042906], [-98.191395, 19.042885]],
        "seg_luz_palafox_n": [[-98.191708, 19.044524], [-98.191647, 19.044667], [-98.191616, 19.044724]],
        "seg_luz_horno_acceso": [[-98.191603, 19.044718], [-98.191634, 19.044662], [-98.191694, 19.04452], [-98.191906, 19.043866], [-98.191913, 19.043843], [-98.192099, 19.043126], [-98.191985, 19.043075], [-98.19189, 19.043036], [-98.191803, 19.043011], [-98.191746, 19.042985], [-98.191678, 19.042974], [-98.191638, 19.042986], [-98.191492, 19.042918], [-98.191405, 19.042894]],
        "seg_luz_a_sanfco": [[-98.191538, 19.044837], [-98.191609, 19.044875], [-98.191681, 19.044906], [-98.191715, 19.044923], [-98.191894, 19.044991], [-98.192076, 19.045093], [-98.192261, 19.045176]],
        "seg_alto_sanfco_jardin": [[-98.192268, 19.045164], [-98.192065, 19.045084], [-98.191626, 19.045866], [-98.191825, 19.045935], [-98.191521, 19.046464], [-98.191501, 19.046529], [-98.191492, 19.046622]],
        "seg_alto_mercado_14norte": [[-98.191499, 19.046627], [-98.191506, 19.046666], [-98.191482, 19.046713], [-98.191254, 19.0471], [-98.191034, 19.047471], [-98.190809, 19.047847], [-98.190976, 19.04793]],
        "seg_xane_concordia_norte": [[-98.190957, 19.047934], [-98.190754, 19.048311], [-98.190485, 19.048773], [-98.19029, 19.048671], [-98.190037, 19.049153]],
        "seg_xane_calle4norte_w": [[-98.190037, 19.049153], [-98.19029, 19.048671], [-98.190486, 19.048772]],
        "seg_xane_callejuela_empedrada": [[-98.190957, 19.047934], [-98.190754, 19.048311]],
        "seg_xane_horno_pan": [[-98.191525, 19.048192], [-98.192315, 19.04861], [-98.192509, 19.048245], [-98.19296, 19.047472]],
        "seg_munecos_2norte": [[-98.197355, 19.043629], [-98.197288, 19.043643], [-98.197233, 19.043613], [-98.197161, 19.043666], [-98.197112, 19.043739]],
        "seg_dulces_6ote": [[-98.19672, 19.044422], [-98.196699, 19.044458], [-98.196265, 19.045208], [-98.196281, 19.045201]],
        "seg_dulces_rosario": [[-98.198201, 19.045218], [-98.19775, 19.045976]],
        "seg_san_pedro_4norte": [[-98.196281, 19.045201], [-98.196259, 19.04519], [-98.194757, 19.044415]],
        "seg_san_roque_parian": [[-98.194758, 19.044431], [-98.194745, 19.044451], [-98.194311, 19.04519]],
        "seg_san_jose_norte": [[-98.195801, 19.045978], [-98.195814, 19.04597], [-98.195369, 19.046745], [-98.194927, 19.047521], [-98.194492, 19.048268]],
        "seg_alfenique_4ote": [[-98.196696, 19.044408], [-98.196675, 19.044446], [-98.196252, 19.045189]],
        "seg_parian_6norte": [[-98.194746, 19.044424], [-98.194733, 19.044445]],
        "seg_barrio_artistas_parian": [[-98.194727, 19.044457], [-98.194758, 19.044431], [-98.195201, 19.043661]],
        "seg_teatro_principal_8norte": [[-98.194747, 19.044444], [-98.194306, 19.045207]],
        "seg_teatro_a_sanfco": [[-98.194298, 19.045196], [-98.193846, 19.045976]],
        "seg_parian_bubas": [[-98.193174, 19.043639], [-98.193024, 19.043561], [-98.192881, 19.043488], [-98.192288, 19.043186], [-98.192294, 19.043159]],
        "seg_bubas_analco": [[-98.192401, 19.042665], [-98.192439, 19.042556], [-98.192566, 19.042296]],
        "seg_luz_cazuelas": [[-98.191405, 19.042894], [-98.191467, 19.042702], [-98.191479, 19.042666], [-98.191449, 19.042623], [-98.191469, 19.042541], [-98.191514, 19.042393], [-98.191329, 19.042338], [-98.191265, 19.042326], [-98.190947, 19.042312], [-98.190488, 19.042362], [-98.190357, 19.04239], [-98.189558, 19.042549], [-98.189396, 19.042533], [-98.189289, 19.042512], [-98.189188, 19.042484], [-98.188853, 19.042325], [-98.188499, 19.042384]],
        "seg_luz_cazuelas_templo": [[-98.19159, 19.044712], [-98.191621, 19.044657], [-98.19168, 19.044516], [-98.191892, 19.043862], [-98.191899, 19.04384], [-98.192085, 19.043123], [-98.192207, 19.042696], [-98.191638, 19.042444], [-98.191556, 19.04242], [-98.191528, 19.042411], [-98.19151, 19.042406], [-98.191325, 19.042351], [-98.191264, 19.042339], [-98.190948, 19.042325], [-98.190488, 19.042362], [-98.19036, 19.042403], [-98.18956, 19.042562], [-98.189394, 19.042546], [-98.189286, 19.042525], [-98.189182, 19.042496], [-98.188851, 19.042338], [-98.188502, 19.042397]],
        "seg_sanfco_templo": [[-98.192261, 19.045176], [-98.192076, 19.045093], [-98.191894, 19.044991], [-98.191715, 19.044923], [-98.191681, 19.044906], [-98.191609, 19.044875], [-98.191538, 19.044837], [-98.191467, 19.044909], [-98.191384, 19.044974], [-98.191274, 19.045039], [-98.190939, 19.045186], [-98.190726, 19.045223], [-98.190365, 19.045285], [-98.190323, 19.045307], [-98.190307, 19.045329], [-98.1903, 19.045354], [-98.1903, 19.045377], [-98.190311, 19.045403], [-98.190276, 19.045379], [-98.190129, 19.045326], [-98.189955, 19.04528]],
        "seg_xane_mirador": [[-98.190056, 19.049146], [-98.190024, 19.049141], [-98.18999, 19.04918], [-98.189925, 19.049257], [-98.189671, 19.049707], [-98.189554, 19.049905], [-98.18958, 19.049993], [-98.189701, 19.050308], [-98.189655, 19.050306], [-98.18955, 19.050337], [-98.189504, 19.050351], [-98.189526, 19.050401], [-98.189486, 19.050443]]
    }

    def build_street_polyline(sid, coord_u, coord_v):
        if sid in segment_waypoints:
            return [coord_u, *segment_waypoints[sid], coord_v]
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
