import { describe, it, expect } from 'vitest';
import { solveOPTW, calculateScoreBreakdown, normalizeText } from './optw.js';
import { POI, RouteRequest, TimeMatrices, SidewalkGraph } from './index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

describe('OPTW Heuristic & Scoring', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '../../..');
  const pois: POI[] = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data/processed/pois.json'), 'utf-8')
  );
  const matrices: TimeMatrices = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data/processed/time_matrices.json'), 'utf-8')
  );
  const graph: SidewalkGraph = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data/processed/sidewalk_graph.json'), 'utf-8')
  );

  it('normaliza texto eliminando diacriticos y mayusculas', () => {
    expect(normalizeText('Catedral de Puebla')).toBe('catedral de puebla');
    expect(normalizeText('Gastronomía y Tradición')).toBe('gastronomia y tradicion');
  });

  it('calcula descomposicion de puntaje S_i con pesos coherentes', () => {
    const req: RouteRequest = {
      profile: 'sin_restriccion',
      max_time_min: 180,
      max_budget_mxn: 200,
      interests: ['artesania', 'comercio_local'],
      language: 'es',
      start_poi_id: 'poi_catedral',
      balance_local_pct: 75
    };
    const poi = pois.find(p => p.id === 'poi_taller_talavera_analco')!;
    const weights = { w_interes: 0.4, w_presupuesto: 0.2, w_dispersion: 0.2, w_local: 0.2 };
    const score = calculateScoreBreakdown(poi, req, weights);

    expect(score.total_s_i).toBeGreaterThan(0.5);
    expect(score.local_business_bonus).toBe(1.0);
    expect(score.dispersion_bonus).toBeGreaterThan(0.5);
  });

  it('resuelve ruta sin_restriccion respetando la ventana de tiempo maxima', () => {
    const req: RouteRequest = {
      profile: 'sin_restriccion',
      max_time_min: 180,
      max_budget_mxn: 300,
      interests: ['arte_sacro', 'gastronomia', 'artesania'],
      language: 'es',
      start_poi_id: 'poi_catedral',
      balance_local_pct: 60
    };

    const solution = solveOPTW(req, pois, matrices, graph);
    expect(solution.main_route.stops.length).toBeGreaterThanOrEqual(2);
    expect(solution.main_route.metrics.total_time_min).toBeLessThanOrEqual(req.max_time_min);
    expect(solution.main_route.metrics.total_cost_mxn).toBeLessThanOrEqual(req.max_budget_mxn);
    expect(solution.alternative_routes.length).toBe(2);
  });

  it('garantiza que perfil silla_de_ruedas solo incluye paradas accesibles y tramos transitables', () => {
    const req: RouteRequest = {
      profile: 'silla_de_ruedas',
      max_time_min: 240,
      max_budget_mxn: 500,
      interests: ['patrimonio', 'artesania', 'gastronomia'],
      language: 'es',
      start_poi_id: 'poi_catedral',
      balance_local_pct: 50
    };

    const solution = solveOPTW(req, pois, matrices, graph);
    for (const stop of solution.main_route.stops) {
      if (stop.poi.id !== req.start_poi_id) {
        expect(stop.poi.entrance_accessible).toBe(true);
      }
    }
    const edgeMap = new Map(graph.edges.map(e => [e.id, e]));
    for (const segId of solution.main_route.path_segments) {
      const seg = edgeMap.get(segId);
      if (seg) {
        expect(seg.transitable.silla_de_ruedas).toBe(true);
      }
    }
  });

  it('reporta porcentaje de tramos verificados y descomposicion de explicacion', () => {
    const req: RouteRequest = {
      profile: 'movilidad_reducida',
      max_time_min: 200,
      max_budget_mxn: 250,
      interests: ['museo', 'patrimonio'],
      language: 'es',
      start_poi_id: 'poi_catedral',
      balance_local_pct: 40
    };

    const solution = solveOPTW(req, pois, matrices, graph);
    expect(solution.main_route.metrics.pct_verified).toBeGreaterThanOrEqual(0);
    expect(solution.main_route.metrics.pct_verified).toBeLessThanOrEqual(100);
    expect(solution.explanation.es).toContain('verificacion presencial');
    expect(solution.main_route.stops[0].score_breakdown).toBeDefined();
  });

  it('genera rutas multiparada con geometria continua sobre banquetas incluso en recorridos cortos (45-90 min)', () => {
    const validVerts = new Set<string>();
    for (const edge of graph.edges) {
      for (const [lon, lat] of edge.geometry.coordinates) {
        validVerts.add(`${lon.toFixed(6)},${lat.toFixed(6)}`);
      }
    }

    for (const maxTime of [45, 60, 90]) {
      const req: RouteRequest = {
        profile: 'sin_restriccion',
        max_time_min: maxTime,
        max_budget_mxn: 150,
        interests: ['alfareria', 'talavera', 'artesanias', 'vidrio'],
        language: 'es',
        start_poi_id: 'poi_catedral',
        balance_local_pct: 85
      };

      const sol = solveOPTW(req, pois, matrices, graph);
      expect(sol.main_route.stops.length).toBeGreaterThanOrEqual(3);
      expect(sol.main_route.metrics.total_time_min).toBeLessThanOrEqual(maxTime);
      expect(sol.main_route.geometry.coordinates.length).toBeGreaterThanOrEqual(4);

      for (const [lon, lat] of sol.main_route.geometry.coordinates) {
        expect(validVerts.has(`${lon.toFixed(6)},${lat.toFixed(6)}`)).toBe(true);
      }
    }
  });
});
