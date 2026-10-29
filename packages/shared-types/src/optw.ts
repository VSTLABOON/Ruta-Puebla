import {
  POI,
  RouteRequest,
  RouteResponse,
  RouteAlternative,
  RouteStop,
  RouteMetrics,
  ScoreBreakdown,
  TimeMatrices,
  SidewalkGraph,
  Segment
} from './index.js';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function calculateScoreBreakdown(
  poi: POI,
  request: RouteRequest,
  weights: { w_interes: number; w_presupuesto: number; w_dispersion: number; w_local: number }
): ScoreBreakdown {
  // 1. Similitud de intereses
  let interestSim = 0.3; // Base minima
  const selectedInterests = request.interests.map(normalizeText);

  if (selectedInterests.length > 0) {
    const poiCategory = normalizeText(poi.category);
    const poiTags = poi.tags.map(normalizeText);

    let matches = 0;
    for (const interest of selectedInterests) {
      if (poiCategory.includes(interest) || interest.includes(poiCategory)) {
        matches += 1.5;
      }
      for (const tag of poiTags) {
        if (tag.includes(interest) || interest.includes(tag)) {
          matches += 1.0;
        }
      }
    }
    interestSim = Math.min(1.0, 0.3 + (matches * 0.25));
  }

  // Texto libre en modo sin conexion: busqueda de tokens clave en descripcion y direccion
  if (request.free_text && request.free_text.trim().length > 0) {
    const tokens = normalizeText(request.free_text).split(/\s+/).filter(t => t.length > 3);
    const poiDesc = normalizeText(poi.description.es + ' ' + poi.description.en + ' ' + poi.name);
    let tokenMatches = 0;
    for (const tok of tokens) {
      if (poiDesc.includes(tok)) {
        tokenMatches += 1;
      }
    }
    if (tokenMatches > 0) {
      interestSim = Math.min(1.0, interestSim + (tokenMatches * 0.15));
    }
  }

  // 2. Ajuste de presupuesto
  let budgetFit = 1.0;
  if (poi.cost_mxn > 0) {
    if (poi.cost_mxn <= request.max_budget_mxn * 0.4) {
      budgetFit = 1.0;
    } else if (poi.cost_mxn <= request.max_budget_mxn) {
      budgetFit = 0.6;
    } else {
      budgetFit = 0.1;
    }
  }

  // 3. Bono de dispersion zonal modulado segun el balance clasica / local
  const isOutsideCore = poi.zone !== 'zocalo_centro_nucleo';
  const localBias = request.balance_local_pct / 100.0;
  // Si balance_local es bajo (clásica), favorecer núcleo zócalo; si es alto, favorecer barrios tradicionales
  const dispersionBonus = isOutsideCore
    ? Math.max(0.15, localBias)
    : Math.max(0.15, 1.0 - localBias);

  // 4. Bono por negocio pequeno / tradicional local (DENUE)
  const localBizBonus = poi.is_local_business ? 1.0 : 0.0;

  // Modulacion de pesos segun slider local
  const effWLocal = weights.w_local * (0.5 + localBias);
  const effWDisp = weights.w_dispersion * (0.5 + localBias);
  const effWInteres = weights.w_interes;
  const effWBudget = weights.w_presupuesto;

  const totalWeights = effWInteres + effWBudget + effWDisp + effWLocal;
  const totalScore = (
    (interestSim * effWInteres) +
    (budgetFit * effWBudget) +
    (dispersionBonus * effWDisp) +
    (localBizBonus * effWLocal)
  ) / totalWeights;

  return {
    interest_similarity: Math.round(interestSim * 100) / 100,
    budget_fit: Math.round(budgetFit * 100) / 100,
    dispersion_bonus: Math.round(dispersionBonus * 100) / 100,
    local_business_bonus: Math.round(localBizBonus * 100) / 100,
    total_s_i: Math.round(totalScore * 100) / 100
  };
}

export interface SolverOptions {
  startTimeMinutes?: number; // minutos desde medianoche (defecto 10:00 = 600)
  zoneCaps?: Record<string, number>;
  weights?: { w_interes: number; w_presupuesto: number; w_dispersion: number; w_local: number };
}

export function solveOPTW(
  request: RouteRequest,
  pois: POI[],
  matrices: TimeMatrices,
  graph: SidewalkGraph,
  options: SolverOptions = {}
): RouteResponse {
  const startTime = options.startTimeMinutes ?? 600; // 10:00 AM
  const zoneCaps = options.zoneCaps ?? {
    zocalo_centro_nucleo: 3,
    barrio_analco: 4,
    barrio_la_luz: 3,
    barrio_el_alto: 3,
    barrio_xanenetla: 3
  };
  const weights = options.weights ?? {
    w_interes: 0.40,
    w_presupuesto: 0.20,
    w_dispersion: 0.20,
    w_local: 0.20
  };

  const poiMap = new Map<string, POI>(pois.map(p => [p.id, p]));
  const poiIndexMap = new Map<string, number>(matrices.poi_ids.map((id, idx) => [id, idx]));
  const profileMatrix = matrices.profiles[request.profile];

  const edgeMap = new Map<string, Segment>(graph.edges.map(e => [e.id, e]));

  // Validar si el punto de partida existe
  const startId = poiMap.has(request.start_poi_id) ? request.start_poi_id : matrices.poi_ids[0];
  const startIdx = poiIndexMap.get(startId)!;
  const startPoi = poiMap.get(startId)!;

  // Evaluar candidaturas factibles
  const candidates: { poi: POI; idx: number; scoreBreakdown: ScoreBreakdown }[] = [];
  for (const poi of pois) {
    const idx = poiIndexMap.get(poi.id);
    if (idx === undefined) continue;

    // Verificacion de transitabilidad en matriz
    const distFromStart = profileMatrix.distance_meters[startIdx][idx];
    if (distFromStart >= 999990) continue;

    // Si es silla de ruedas, validar acceso de entrada al edificio
    if (request.profile === 'silla_de_ruedas' && !poi.entrance_accessible && poi.id !== startId) {
      continue;
    }

    const sb = calculateScoreBreakdown(poi, request, weights);
    candidates.push({ poi, idx, scoreBreakdown: sb });
  }

  // Funcion auxiliar para generar una alternativa de ruta
  function generateAlternative(
    focus: 'clasica' | 'barrios_locales' | 'mas_accesible',
    localBiasOverride?: number
  ): RouteAlternative {
    const _bias = localBiasOverride ?? request.balance_local_pct;
    void _bias;
    const currentZoneCounts: Record<string, number> = {};
    for (const z of Object.keys(zoneCaps)) currentZoneCounts[z] = 0;

    const visitedIndices = new Set<number>();
    visitedIndices.add(startIdx);
    currentZoneCounts[startPoi.zone] = (currentZoneCounts[startPoi.zone] || 0) + 1;

    let routeOrder: number[] = [startIdx];
    let accumulatedBudget = startPoi.cost_mxn;

    const getEffectiveVisitMin = (poi: POI, isStart: boolean): number => {
      if (isStart && request.max_time_min <= 100) {
        return Math.min(poi.visit_duration_min, Math.max(10, Math.round(request.max_time_min * 0.24)));
      }
      if (request.max_time_min <= 60) {
        return Math.max(10, Math.round(poi.visit_duration_min * 0.5));
      }
      if (request.max_time_min <= 100) {
        return Math.max(12, Math.round(poi.visit_duration_min * 0.7));
      }
      return poi.visit_duration_min;
    };

    // Evaluador de factibilidad temporal y presupuestal de un orden de paradas (recorrido abierto sin retorno cruzado)
    function evaluateFeasibility(order: number[]) {
      const startVisit = getEffectiveVisitMin(startPoi, true);
      let t = startTime + startVisit;
      let totalWalk = 0;
      let totalVisit = startVisit;
      let budget = startPoi.cost_mxn;

      for (let k = 1; k < order.length; k++) {
        const u = order[k - 1];
        const v = order[k];
        const pV = pois.find(p => poiIndexMap.get(p.id) === v)!;
        const wMin = profileMatrix.time_minutes[u][v];
        if (wMin >= 999990) return null;
        totalWalk += wMin;
        budget += pV.cost_mxn;
        if (budget > request.max_budget_mxn) return null;

        const openT = parseTimeToMinutes(pV.hours.open);
        const closeT = parseTimeToMinutes(pV.hours.close);
        const arrT = Math.max(t + wMin, openT);
        if (arrT > closeT) return null;
        const visitDur = getEffectiveVisitMin(pV, false);
        totalVisit += visitDur;
        t = arrT + visitDur;
      }

      // Verificar conectividad del nodo final en la componente conexa del perfil
      const last = order[order.length - 1];
      const retMin = profileMatrix.time_minutes[last][startIdx];
      if (retMin >= 999990) return null;
      if (Math.round(totalWalk + totalVisit) > request.max_time_min) return null;

      return { totalTime: Math.round(totalWalk + totalVisit), totalWalk, budget };
    }

    // Heuristica de insercion optima (Best-Insertion basada en desvio marginal de caminata)
    let finished = false;
    while (!finished) {
      let bestCandidate: { poi: POI; idx: number; scoreBreakdown: ScoreBreakdown } | null = null;
      let bestInsertPos = -1;
      let bestEfficiency = -1;

      for (const cand of candidates) {
        if (visitedIndices.has(cand.idx)) continue;

        // Filtro por enfoque
        if (focus === 'clasica' && cand.poi.zone !== 'zocalo_centro_nucleo') {
          continue;
        }

        // Respeto de cupo zonal
        const zCount = currentZoneCounts[cand.poi.zone] || 0;
        const maxCap = zoneCaps[cand.poi.zone] || 4;
        if (zCount >= maxCap) continue;

        if (accumulatedBudget + cand.poi.cost_mxn > request.max_budget_mxn) continue;

        // Modulacion segun enfoque
        let score = cand.scoreBreakdown.total_s_i;
        if (focus === 'barrios_locales' && cand.poi.zone !== 'zocalo_centro_nucleo') {
          score *= 1.4;
        }
        if (focus === 'mas_accesible' && cand.poi.restroom_accessible) {
          score *= 1.25;
        }

        // Evaluar todas las posiciones posibles de insercion [1 .. routeOrder.length]
        for (let pos = 1; pos <= routeOrder.length; pos++) {
          const testOrder = [...routeOrder.slice(0, pos), cand.idx, ...routeOrder.slice(pos)];
          const feas = evaluateFeasibility(testOrder);
          if (!feas) continue;

          // Desvio marginal en tiempo de caminata
          let detourMin = 0;
          if (pos === routeOrder.length) {
            const last = routeOrder[routeOrder.length - 1];
            detourMin = profileMatrix.time_minutes[last][cand.idx];
          } else {
            const u = routeOrder[pos - 1];
            const w = routeOrder[pos];
            detourMin = profileMatrix.time_minutes[u][cand.idx] + profileMatrix.time_minutes[cand.idx][w] - profileMatrix.time_minutes[u][w];
          }

          // Eficiencia espacial: ratio entre el valor cultural y el desvio marginal
          const eff = score / Math.max(0.4, detourMin);
          if (eff > bestEfficiency) {
            bestEfficiency = eff;
            bestCandidate = cand;
            bestInsertPos = pos;
          }
        }
      }

      if (bestCandidate && bestInsertPos !== -1) {
        routeOrder = [...routeOrder.slice(0, bestInsertPos), bestCandidate.idx, ...routeOrder.slice(bestInsertPos)];
        visitedIndices.add(bestCandidate.idx);
        accumulatedBudget += bestCandidate.poi.cost_mxn;
        currentZoneCounts[bestCandidate.poi.zone] = (currentZoneCounts[bestCandidate.poi.zone] || 0) + 1;
      } else {
        finished = true;
      }
    }

    // Busqueda local 2-opt exhaustiva para desenredar cruces de ruta
    if (routeOrder.length > 3) {
      let improved = true;
      let iterations = 0;
      while (improved && iterations < 25) {
        improved = false;
        iterations++;
        for (let i = 1; i < routeOrder.length - 1; i++) {
          for (let j = i + 1; j < routeOrder.length; j++) {
            // Intentar invertir segmento entre i y j
            const newOrder = [...routeOrder.slice(0, i), ...routeOrder.slice(i, j + 1).reverse(), ...routeOrder.slice(j + 1)];
            const feas = evaluateFeasibility(newOrder);
            if (feas) {
              const oldWalk = calculateWalkDistance(routeOrder, profileMatrix);
              const newWalk = calculateWalkDistance(newOrder, profileMatrix);
              if (newWalk < oldWalk - 0.5) {
                routeOrder = newOrder;
                improved = true;
                break;
              }
            }
          }
          if (improved) break;
        }
      }
    }

    // Construccion de paradas, segmentos y metricas finales
    const stops: RouteStop[] = [];
    const pathSegments: string[] = [];
    const routeCoords: [number, number][] = [];
    let currentT = startTime;
    let totalWalkingMin = 0;
    let totalVisitMin = 0;
    let totalWalkMeters = 0;
    let totalCost = 0;

    const sqDist = (a: [number, number], b: [number, number]) =>
      (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);

    const pushCoordDedup = (pt: [number, number]) => {
      if (routeCoords.length === 0) {
        routeCoords.push(pt);
        return;
      }
      const last = routeCoords[routeCoords.length - 1];
      if (Math.abs(last[0] - pt[0]) > 1e-6 || Math.abs(last[1] - pt[1]) > 1e-6) {
        routeCoords.push(pt);
      }
    };

    const findShortestSidewalkSegments = (fromCoord: [number, number], toCoord: [number, number]): string[] => {
      const nodeEntries = Object.entries(graph.nodes || {});
      if (nodeEntries.length === 0) return [];
      let startNode = nodeEntries[0][0];
      let endNode = nodeEntries[0][0];
      let bestStartD = Infinity;
      let bestEndD = Infinity;
      for (const [nid, nd] of nodeEntries) {
        const ds = sqDist(fromCoord, nd.coordinates);
        if (ds < bestStartD) {
          bestStartD = ds;
          startNode = nid;
        }
        const de = sqDist(toCoord, nd.coordinates);
        if (de < bestEndD) {
          bestEndD = de;
          endNode = nid;
        }
      }
      if (startNode === endNode) return [];
      const adj = new Map<string, { to: string; len: number; segId: string }[]>();
      for (const e of graph.edges) {
        if (!e.transitable[request.profile]) continue;
        if (!adj.has(e.from_node)) adj.set(e.from_node, []);
        if (!adj.has(e.to_node)) adj.set(e.to_node, []);
        adj.get(e.from_node)!.push({ to: e.to_node, len: e.length_m, segId: e.id });
        adj.get(e.to_node)!.push({ to: e.from_node, len: e.length_m, segId: e.id });
      }
      const dist = new Map<string, number>([[startNode, 0]]);
      const prev = new Map<string, { node: string; segId: string }>();
      const visited = new Set<string>();
      while (visited.size < nodeEntries.length) {
        let u: string | null = null;
        let best = Infinity;
        for (const [n, d] of dist.entries()) {
          if (!visited.has(n) && d < best) {
            best = d;
            u = n;
          }
        }
        if (!u || u === endNode) break;
        visited.add(u);
        for (const edge of adj.get(u) || []) {
          const nd = best + edge.len;
          if (nd < (dist.get(edge.to) ?? Infinity)) {
            dist.set(edge.to, nd);
            prev.set(edge.to, { node: u, segId: edge.segId });
          }
        }
      }
      const out: string[] = [];
      let cur = endNode;
      while (cur !== startNode) {
        const p = prev.get(cur);
        if (!p) return [];
        out.push(p.segId);
        cur = p.node;
      }
      out.reverse();
      return out;
    };

    for (let i = 0; i < routeOrder.length; i++) {
      const idx = routeOrder[i];
      const poi = pois.find(p => poiIndexMap.get(p.id) === idx)!;
      let arrivalT = currentT;
      let walkMin = 0;

      if (i === 0) {
        pushCoordDedup(poi.coordinates);
      } else {
        const prevIdx = routeOrder[i - 1];
        const prevPoi = pois.find(p => poiIndexMap.get(p.id) === prevIdx)!;
        walkMin = profileMatrix.time_minutes[prevIdx][idx];
        const walkM = profileMatrix.distance_meters[prevIdx][idx];
        const matrixSegs = profileMatrix.path_segments?.[prevIdx]?.[idx];
        const segs =
          Array.isArray(matrixSegs) && matrixSegs.length > 0
            ? matrixSegs
            : findShortestSidewalkSegments(prevPoi.coordinates, poi.coordinates);
        totalWalkingMin += walkMin;
        totalWalkMeters += walkM;
        let currentPos: [number, number] =
          routeCoords.length > 0 ? routeCoords[routeCoords.length - 1] : prevPoi.coordinates;

        if (segs.length > 0) {
          pathSegments.push(...segs);
          for (const sid of segs) {
            const seg = edgeMap.get(sid);
            if (seg && seg.geometry && seg.geometry.coordinates && seg.geometry.coordinates.length > 0) {
              const rawCoords = seg.geometry.coordinates;
              const firstPt = rawCoords[0];
              const lastPt = rawCoords[rawCoords.length - 1];
              const ordered =
                sqDist(currentPos, lastPt) < sqDist(currentPos, firstPt)
                  ? [...rawCoords].reverse()
                  : rawCoords;
              for (const pt of ordered) {
                pushCoordDedup(pt);
              }
              currentPos = routeCoords[routeCoords.length - 1];
            }
          }
        }
        pushCoordDedup(poi.coordinates);
        arrivalT = Math.max(currentT + walkMin, parseTimeToMinutes(poi.hours.open));
      }

      const visitDur = getEffectiveVisitMin(poi, i === 0);
      const departureT = arrivalT + visitDur;
      totalVisitMin += visitDur;
      totalCost += poi.cost_mxn;
      currentT = departureT;

      const cand = candidates.find(c => c.idx === idx);
      const scoreBk = cand ? cand.scoreBreakdown : calculateScoreBreakdown(poi, request, weights);

      stops.push({
        stop_order: i + 1,
        poi,
        arrival_time_min: arrivalT,
        departure_time_min: departureT,
        cost_mxn: poi.cost_mxn,
        score_breakdown: scoreBk,
        accessibility_notes: {
          es: poi.entrance_accessible ? 'Entrada al nivel de banqueta sin escalon.' : 'Presenta desnivel o escalon al ingreso.',
          en: poi.entrance_accessible ? 'Sidewalk level entrance without steps.' : 'Step or vertical threshold at entrance.'
        }
      });
    }

    // Calculo del porcentaje de metros verificados en auditoria (sobre el recorrido efectivo entre paradas)
    let verifiedMeters = 0;
    let totalPathLength = 0;
    const uniqueSegs = Array.from(new Set(pathSegments));
    for (const sid of uniqueSegs) {
      const seg = edgeMap.get(sid);
      if (seg) {
        totalPathLength += seg.length_m;
        if (seg.is_verified) {
          verifiedMeters += seg.length_m;
        }
      }
    }
    const pctVerified = totalPathLength > 0 ? Math.round((verifiedMeters / totalPathLength) * 100) : 0;

    // Metricas de negocio local y dispersion
    const nonStartStops = stops.slice(1);
    const localStopsCount = nonStartStops.filter(s => s.poi.is_local_business).length;
    const outsideCoreCount = nonStartStops.filter(s => s.poi.zone !== 'zocalo_centro_nucleo').length;
    const pctLocalStops = nonStartStops.length > 0 ? Math.round((localStopsCount / nonStartStops.length) * 100) : 0;
    const pctOutsideCore = nonStartStops.length > 0 ? Math.round((outsideCoreCount / nonStartStops.length) * 100) : 0;

    if (routeCoords.length === 0) {
      for (const s of stops) {
        pushCoordDedup(s.poi.coordinates);
      }
    }

    const metrics: RouteMetrics = {
      total_time_min: Math.round(totalWalkingMin + totalVisitMin),
      walking_time_min: Math.round(totalWalkingMin),
      visit_time_min: Math.round(totalVisitMin),
      distance_meters: Math.round(totalWalkMeters),
      total_cost_mxn: totalCost,
      pct_verified: pctVerified,
      pct_local_stops: pctLocalStops,
      pct_outside_core: pctOutsideCore,
      feasible_for_profile: true
    };

    return {
      name: focus === 'clasica' ? 'Ruta Tradicional Zocalo' : focus === 'barrios_locales' ? 'Ruta Barrios Tradicionales' : 'Ruta Optimizada Accesible',
      focus,
      stops,
      path_segments: pathSegments,
      metrics,
      geometry: {
        type: 'LineString',
        coordinates: routeCoords
      }
    };
  }

  function calculateWalkDistance(order: number[], mat: typeof profileMatrix): number {
    let d = 0;
    for (let i = 0; i < order.length - 1; i++) {
      d += mat.distance_meters[order[i]][order[i + 1]];
    }
    return d;
  }

  // Generar ruta principal optimizada segun balance local del usuario
  const mainFocus: 'barrios_locales' | 'clasica' | 'mas_accesible' =
    request.balance_local_pct >= 50 ? 'barrios_locales' : 'mas_accesible';
  const mainRoute = generateAlternative(mainFocus);

  // Generar alternativas comparativas
  const altClassic = generateAlternative('clasica', 0);
  const altLocal = generateAlternative('barrios_locales', 100);

  const explanation = {
    es: `Ruta generada para perfil ${request.profile} con ${mainRoute.stops.length} paradas. El ${mainRoute.metrics.pct_verified}% de los tramos cuenta con verificacion presencial de alta confianza. Incluye un ${mainRoute.metrics.pct_local_stops}% de paradas en pequenos comercios locales y un ${mainRoute.metrics.pct_outside_core}% fuera del zocalo.`,
    en: `Route generated for ${request.profile} profile with ${mainRoute.stops.length} stops. ${mainRoute.metrics.pct_verified}% of segments have high-confidence on-site audit verification. Includes ${mainRoute.metrics.pct_local_stops}% stops at local businesses and ${mainRoute.metrics.pct_outside_core}% outside the central square.`
  };

  return {
    main_route: mainRoute,
    alternative_routes: [altClassic, altLocal],
    explanation
  };
}
