-- Esquema de Base de Datos Espacial para Ruta Abierta Puebla
-- PostgreSQL 16 con PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Zonas Urbanas y Cupos
CREATE TABLE IF NOT EXISTS zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    max_cap INTEGER NOT NULL DEFAULT 4,
    underused_score NUMERIC(4, 2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Segmentos de Acera y Cruce (Topologia Peatonal)
CREATE TABLE IF NOT EXISTS segments (
    id VARCHAR(64) PRIMARY KEY,
    osm_way_id VARCHAR(64),
    side VARCHAR(16) NOT NULL CHECK (side IN ('left', 'right', 'crossing')),
    from_node VARCHAR(64) NOT NULL,
    to_node VARCHAR(64) NOT NULL,
    zone_id VARCHAR(64) REFERENCES zones(id),
    length_m NUMERIC(8, 2) NOT NULL,
    width_m NUMERIC(4, 2) NOT NULL,
    slope_pct NUMERIC(4, 2) NOT NULL,
    surface VARCHAR(64) NOT NULL,
    has_curb_ramp BOOLEAN NOT NULL DEFAULT FALSE,
    has_steps BOOLEAN NOT NULL DEFAULT FALSE,
    transitable_sin_restriccion BOOLEAN NOT NULL DEFAULT TRUE,
    transitable_movilidad_reducida BOOLEAN NOT NULL DEFAULT TRUE,
    transitable_silla_de_ruedas BOOLEAN NOT NULL DEFAULT FALSE,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.150,
    audit_count INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    geom GEOMETRY(LineString, 4326),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Auditorias de Accesibilidad en Campo
CREATE TABLE IF NOT EXISTS field_audits (
    id VARCHAR(64) PRIMARY KEY,
    segment_id VARCHAR(64) REFERENCES segments(id),
    auditor_id VARCHAR(64) NOT NULL,
    free_width_m NUMERIC(4, 2) NOT NULL,
    slope_pct NUMERIC(4, 2) NOT NULL,
    surface VARCHAR(64) NOT NULL,
    has_steps BOOLEAN NOT NULL DEFAULT FALSE,
    obstacles TEXT,
    ramp_start BOOLEAN NOT NULL DEFAULT FALSE,
    ramp_end BOOLEAN NOT NULL DEFAULT FALSE,
    crossing_type VARCHAR(32) DEFAULT 'unmarked',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Puntos de Interes y Atractivos Culturales / Locales
CREATE TABLE IF NOT EXISTS pois (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    category VARCHAR(64) NOT NULL,
    zone_id VARCHAR(64) REFERENCES zones(id),
    hours_open TIME NOT NULL,
    hours_close TIME NOT NULL,
    cost_mxn NUMERIC(8, 2) NOT NULL DEFAULT 0,
    visit_duration_min INTEGER NOT NULL DEFAULT 30,
    entrance_accessible BOOLEAN NOT NULL DEFAULT FALSE,
    restroom_accessible BOOLEAN NOT NULL DEFAULT FALSE,
    is_local_business BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(32) NOT NULL DEFAULT 'curated',
    denue_id VARCHAR(64),
    osm_id VARCHAR(64),
    description_es TEXT,
    description_en TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Parametros y Coeficientes del Modelo de Eleccion
CREATE TABLE IF NOT EXISTS choice_model_coefficients (
    id SERIAL PRIMARY KEY,
    feature_name VARCHAR(64) NOT NULL UNIQUE,
    estimate NUMERIC(8, 4) NOT NULL,
    ci_95_lower NUMERIC(8, 4) NOT NULL,
    ci_95_upper NUMERIC(8, 4) NOT NULL,
    calibration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Ranking de Barreras Urbanas
CREATE TABLE IF NOT EXISTS barrier_rankings (
    segment_id VARCHAR(64) PRIMARY KEY REFERENCES segments(id),
    blocked_profile VARCHAR(32) NOT NULL,
    unlocked_pois_count INTEGER NOT NULL DEFAULT 0,
    weighted_impact_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices espaciales
CREATE INDEX IF NOT EXISTS idx_segments_geom ON segments USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_pois_geom ON pois USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_audits_segment_id ON field_audits (segment_id);
