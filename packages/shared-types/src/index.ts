export type MobilityProfile = 'sin_restriccion' | 'movilidad_reducida' | 'silla_de_ruedas';

export type Language = 'es' | 'en';

export type ZoneId =
  | 'zocalo_centro_nucleo'
  | 'barrio_analco'
  | 'barrio_la_luz'
  | 'barrio_el_alto'
  | 'barrio_xanenetla';

export type SidewalkSide = 'left' | 'right' | 'crossing';

export type SurfaceType =
  | 'concreto'
  | 'laja_colonial'
  | 'laja_colonial_nivelada'
  | 'adoquin'
  | 'adoquin_asentado'
  | 'empedrado'
  | 'empedrado_colonial_irregular'
  | 'empedrado_desprendido'
  | 'asfalto';

export type POICategory =
  | 'museo'
  | 'iglesia'
  | 'gastronomia'
  | 'artesania'
  | 'espacio_publico'
  | 'comercio_local'
  | 'historico';

export interface TransitabilityByProfile {
  sin_restriccion: boolean;
  movilidad_reducida: boolean;
  silla_de_ruedas: boolean;
}

export interface ComplianceNorm {
  nom_001_sedatu: boolean;
  nom_004_sedatu: boolean;
  ntdiu_puebla: boolean;
  estado_verificacion: 'por_verificar_contra_dof';
}

export interface Segment {
  id: string;
  osm_way_id: string;
  side: SidewalkSide;
  from_node: string;
  to_node: string;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  length_m: number;
  zone: ZoneId;
  slope_pct: number;
  width_m: number;
  surface: SurfaceType;
  has_curb_ramp: boolean;
  has_steps: boolean;
  transitable: TransitabilityByProfile;
  compliance_norm: ComplianceNorm;
  confidence: number;
  audit_count: number;
  is_verified: boolean;
}

export interface Audit {
  id: string;
  segment_id: string;
  auditor_id: string;
  free_width_m: number;
  slope_pct: number;
  surface: SurfaceType;
  has_steps: boolean;
  obstacles: string[];
  ramp_start: boolean;
  ramp_end: boolean;
  crossing_type: 'semaphorized' | 'marked' | 'unmarked' | 'none';
  timestamp: string;
  photo_url?: string;
  notes?: string;
}

export interface CulturalSecret {
  titulo: string;
  descripcion: string;
  pista: string;
  insignia_nombre: string;
}

export interface HistoricalFigure {
  nombre: string;
  rol: string;
  epoca: string;
  relato: string;
}

export interface VisitorMemory {
  id: string;
  autor: string;
  procedencia: string;
  fecha: string;
  testimonio: string;
  perfil: MobilityProfile;
}

export interface ArtisanProfile {
  nombre_taller: string;
  maestro_artesano: string;
  oficio: string;
  fundacion_anio: number;
  demostracion_en_vivo: string;
  horario_demostracion: string;
  tecnica_ancestral: string;
  sello_artesanal: string;
}

export interface PassportState {
  unlocked_secrets: string[];
  visited_poi_ids: string[];
  collected_badges: string[];
}

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  coordinates: [number, number];
  hours: {
    open: string;
    close: string;
  };
  cost_mxn: number;
  visit_duration_min: number;
  languages: Language[];
  entrance_accessible: boolean;
  restroom_accessible: boolean;
  source: 'denue' | 'osm' | 'curated';
  denue_id?: string;
  osm_id?: string;
  is_local_business: boolean;
  zone: ZoneId;
  tags: string[];
  description: {
    es: string;
    en: string;
  };
  address: string;
  secret_to_unlock?: CulturalSecret;
  historical_figures?: HistoricalFigure[];
  community_memories?: VisitorMemory[];
  artisan_profile?: ArtisanProfile;
}


export interface RouteRequest {
  profile: MobilityProfile;
  max_time_min: number;
  max_budget_mxn: number;
  interests: string[];
  free_text?: string;
  language: Language;
  start_poi_id: string;
  balance_local_pct: number;
}

export interface ScoreBreakdown {
  interest_similarity: number;
  budget_fit: number;
  dispersion_bonus: number;
  local_business_bonus: number;
  total_s_i: number;
}

export interface RouteStop {
  stop_order: number;
  poi: POI;
  arrival_time_min: number;
  departure_time_min: number;
  cost_mxn: number;
  score_breakdown: ScoreBreakdown;
  accessibility_notes: {
    es: string;
    en: string;
  };
}

export interface RouteMetrics {
  total_time_min: number;
  walking_time_min: number;
  visit_time_min: number;
  distance_meters: number;
  total_cost_mxn: number;
  pct_verified: number;
  pct_local_stops: number;
  pct_outside_core: number;
  feasible_for_profile: boolean;
}

export interface RouteAlternative {
  name: string;
  focus: 'clasica' | 'barrios_locales' | 'mas_accesible';
  stops: RouteStop[];
  path_segments: string[];
  metrics: RouteMetrics;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface RouteResponse {
  main_route: RouteAlternative;
  alternative_routes: RouteAlternative[];
  explanation: {
    es: string;
    en: string;
  };
}

export interface SidewalkGraph {
  nodes: Record<string, { id: string; coordinates: [number, number] }>;
  edges: Segment[];
}

export interface TimeMatrices {
  poi_ids: string[];
  profiles: Record<MobilityProfile, {
    time_minutes: number[][];
    distance_meters: number[][];
    path_segments: string[][][];
  }>;
}

export interface SimulationScenario {
  id: string;
  profile: MobilityProfile;
  time_budget_min: number;
  budget_mxn: number;
  interests: string[];
  language: Language;
}

export interface SimulationResultRow {
  scenario_id: string;
  profile: MobilityProfile;
  strategy: 'clasica' | 'mas_corta' | 'optimizada';
  total_time_min: number;
  walking_time_min: number;
  distance_meters: number;
  total_cost_mxn: number;
  stops_count: number;
  pct_outside_core: number;
  pct_local_spend: number;
  pct_verified: number;
  is_wheelchair_feasible: boolean;
  utility_score: number;
}

export interface SimulationSummaryMetric {
  mean: number;
  ci_95_lower: number;
  ci_95_upper: number;
}

export interface SimulationReport {
  timestamp: string;
  total_scenarios: number;
  profiles_evaluated: MobilityProfile[];
  strategies: {
    clasica: Record<string, SimulationSummaryMetric>;
    mas_corta: Record<string, SimulationSummaryMetric>;
    optimizada: Record<string, SimulationSummaryMetric>;
  };
  unfavorable_findings: string[];
}

export * from './optw.js';
