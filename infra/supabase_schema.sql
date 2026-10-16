-- ==============================================================================
-- RUTA ABIERTA PUEBLA - ESQUEMA SUPABASE CLOUD (HÍBRIDO CONEXIÓN / SIN CONEXIÓN)
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase
-- ==============================================================================

-- 1. Habilitar extensiones geoespaciales y UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Tabla de Perfiles de Usuario (Turistas, Artesanos, Administradores)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('tourist', 'artisan', 'government')),
  mobility_profile TEXT DEFAULT 'sin_restriccion',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Pasaporte y Sellos Desbloqueados
CREATE TABLE IF NOT EXISTS public.user_passports (
  user_id TEXT PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  unlocked_secrets JSONB DEFAULT '[]'::jsonb,
  visited_poi_ids JSONB DEFAULT '[]'::jsonb,
  collected_badges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Bitácora de Caminatas y Récords Personales
CREATE TABLE IF NOT EXISTS public.walk_records (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  distance_meters INTEGER NOT NULL DEFAULT 0,
  stops_visited INTEGER NOT NULL DEFAULT 0,
  badges_earned INTEGER NOT NULL DEFAULT 0,
  zone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Demostraciones y Sellos Emitidos por Talleres Artesanales
CREATE TABLE IF NOT EXISTS public.workshop_stamps_issued (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id TEXT NOT NULL,
  workshop_name TEXT NOT NULL,
  artisan_name TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('NFC', 'QR', 'PIN')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Políticas de Seguridad (Row Level Security - RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walk_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_stamps_issued ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas de lectura y escritura para demostraciones con Anon Key
CREATE POLICY "Acceso público de lectura para perfiles"
  ON public.user_profiles FOR SELECT USING (true);

CREATE POLICY "Inserción y actualización pública para perfiles"
  ON public.user_profiles FOR ALL USING (true);

CREATE POLICY "Acceso público para pasaportes"
  ON public.user_passports FOR ALL USING (true);

CREATE POLICY "Acceso público para bitácora de caminatas"
  ON public.walk_records FOR ALL USING (true);

CREATE POLICY "Acceso público para sellos de talleres"
  ON public.workshop_stamps_issued FOR ALL USING (true);
