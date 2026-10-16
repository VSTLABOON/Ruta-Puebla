import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  POI,
  SidewalkGraph,
  TimeMatrices,
  PassportState,
  MobilityProfile
} from '@ruta-abierta/shared-types';
import { DataInfoModal } from './components/DataInfoModal';
import { CelebrationModal } from './components/CelebrationModal';
import { USER_ROLES, UserRole } from './types/roles';
import {
  Languages,
  Filter,
  Compass,
  Store,
  BarChart3,
  UserCheck,
  ChevronDown,
  Check,
  Smartphone,
  Monitor,
  X,
  Radio
} from 'lucide-react';
import { tacticalAudio } from './utils/tacticalAudio';
import { RouterProvider, useRouter } from './router/Router';

// Carga diferida (code-splitting) de las 3 vistas por rol
const VisitorView = React.lazy(() => import('./views/visitor/VisitorView'));
const ArtisanView = React.lazy(() => import('./views/artisan/ArtisanView'));
const AdminView = React.lazy(() => import('./views/admin/AdminView'));

// Enriquecer dinámicamente la matriz de tiempos y distancias para incluir las 24 locaciones
function enrichTimeMatrices(pois: POI[], baseMatrices: TimeMatrices): TimeMatrices {
  const existingSet = new Set(baseMatrices.poi_ids);
  const missingPois = pois.filter((p) => !existingSet.has(p.id));
  if (missingPois.length === 0) return baseMatrices;

  const allIds = [...baseMatrices.poi_ids, ...missingPois.map((p) => p.id)];
  const poiMap = new Map(pois.map((p) => [p.id, p]));
  const n = allIds.length;
  const oldN = baseMatrices.poi_ids.length;

  const haversineMeters = (c1: [number, number], c2: [number, number]) => {
    const R = 6371e3;
    const phi1 = (c1[1] * Math.PI) / 180;
    const phi2 = (c2[1] * Math.PI) / 180;
    const dPhi = ((c2[1] - c1[1]) * Math.PI) / 180;
    const dLam = ((c2[0] - c1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.32);
  };

  const profiles: MobilityProfile[] = ['sin_restriccion', 'movilidad_reducida', 'silla_de_ruedas'];
  const speedMetersPerMin: Record<MobilityProfile, number> = {
    sin_restriccion: 72,
    movilidad_reducida: 55,
    silla_de_ruedas: 50
  };

  const newProfiles = {} as TimeMatrices['profiles'];

  for (const prof of profiles) {
    const oldSub = baseMatrices.profiles[prof];
    const time_minutes: number[][] = Array.from({ length: n }, () => Array(n).fill(999));
    const distance_meters: number[][] = Array.from({ length: n }, () => Array(n).fill(99999));
    const path_segments: string[][][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => [])
    );

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          time_minutes[i][j] = 0;
          distance_meters[i][j] = 0;
          path_segments[i][j] = [];
          continue;
        }
        if (i < oldN && j < oldN) {
          time_minutes[i][j] = oldSub.time_minutes[i][j];
          distance_meters[i][j] = oldSub.distance_meters[i][j];
          path_segments[i][j] = oldSub.path_segments[i][j];
        } else {
          const pA = poiMap.get(allIds[i]);
          const pB = poiMap.get(allIds[j]);
          if (pA && pB) {
            if (prof !== 'sin_restriccion' && (!pA.entrance_accessible || !pB.entrance_accessible)) {
              time_minutes[i][j] = 999;
              distance_meters[i][j] = 99999;
            } else {
              const dist = haversineMeters(pA.coordinates, pB.coordinates);
              distance_meters[i][j] = dist;
              time_minutes[i][j] = Math.max(2, Math.round(dist / speedMetersPerMin[prof]));
            }
          }
        }
      }
    }

    newProfiles[prof] = { time_minutes, distance_meters, path_segments };
  }

  return {
    ...baseMatrices,
    poi_ids: allIds,
    profiles: newProfiles
  };
}

function MainApp() {
  const { activeRoute, navigate } = useRouter();

  // Mapeo automático de ruta a rol de usuario
  const currentRole: UserRole = useMemo(() => {
    if (activeRoute === '/taller') return 'artisan';
    if (activeRoute === '/admin') return 'government';
    return 'tourist';
  }, [activeRoute]);

  const activeRoleDef = useMemo(() => USER_ROLES[currentRole], [currentRole]);

  // Modo de visualización: Marco Móvil 390x844 o Pantalla Completa
  const [viewportMode, setViewportMode] = useState<'mobile' | 'full'>('full');

  // Modales
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    badgeName: string;
    title: string;
    description: string;
    zone: string;
  } | null>(null);

  // Ubicación del usuario en el mapa (por defecto: Zócalo de Puebla)
  const [userLocation, setUserLocation] = useState<[number, number]>([-98.198, 19.0431]);

  // Datos
  const [pois, setPois] = useState<POI[]>([]);
  const [graph, setGraph] = useState<SidewalkGraph | null>(null);
  const [matrices, setMatrices] = useState<TimeMatrices | null>(null);
  const [weights, setWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Pasaporte de Exploración dinámico
  const [passportState, setPassportState] = useState<PassportState>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_passport');
      return saved
        ? JSON.parse(saved)
        : { unlocked_secrets: [], visited_poi_ids: [], collected_badges: [] };
    } catch {
      return { unlocked_secrets: [], visited_poi_ids: [], collected_badges: [] };
    }
  });

  const handleUnlockSecret = (poiId: string, badgeName: string) => {
    setPassportState((prev) => {
      const newSecrets = prev.unlocked_secrets.includes(poiId)
        ? prev.unlocked_secrets
        : [...prev.unlocked_secrets, poiId];
      const newBadges = prev.collected_badges.includes(badgeName)
        ? prev.collected_badges
        : [...prev.collected_badges, badgeName];
      const next = { ...prev, unlocked_secrets: newSecrets, collected_badges: newBadges };
      try {
        localStorage.setItem('ruta_abierta_passport', JSON.stringify(next));
      } catch {}
      return next;
    });

    const targetPoi = pois.find((p) => p.id === poiId);
    if (targetPoi && targetPoi.secret_to_unlock) {
      setCelebrationData({
        badgeName,
        title: targetPoi.secret_to_unlock.titulo,
        description: targetPoi.secret_to_unlock.descripcion,
        zone: targetPoi.zone
      });
    }
  };

  // Carga inicial con cache-busting para Brave y Cloudflare
  useEffect(() => {
    async function loadStaticData() {
      try {
        const fetchOpts: RequestInit = { cache: 'no-store' };
        const [poisRes, graphRes, matricesRes, weightsRes] = await Promise.all([
          fetch('/data/pois.json?v=3', fetchOpts).then((r) => r.json()),
          fetch('/data/sidewalk_graph.json?v=3', fetchOpts).then((r) => r.json()),
          fetch('/data/time_matrices.json?v=3', fetchOpts).then((r) => r.json()),
          fetch('/data/choice_model_weights.json?v=3', fetchOpts).then((r) => r.json())
        ]);

        const enriched = enrichTimeMatrices(poisRes, matricesRes);
        setPois(poisRes);
        setGraph(graphRes);
        setMatrices(enriched);
        setWeights(weightsRes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setIsLoading(false);
      }
    }

    loadStaticData();
  }, []);

  const handleSelectRole = (newRole: UserRole) => {
    tacticalAudio.playTacticalClick();
    if (newRole === 'tourist') navigate('/');
    else if (newRole === 'artisan') navigate('/taller');
    else if (newRole === 'government') navigate('/admin');
    setIsRoleModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-400">
            {language === 'es' ? 'Cargando Mapa de Puebla...' : 'Loading Puebla Map...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Cabecera Principal */}
      <header className="bg-slate-950/90 backdrop-blur-xl border-b border-white/10 text-white z-40 flex-shrink-0">
        <div className="w-full px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
          {/* Logo y Enlace a Inicio */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(245,158,11,0.5)] flex-shrink-0 group-hover:scale-105 transition-transform">
              RA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white uppercase">
                  Ruta Abierta Puebla
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pois.length} {language === 'es' ? 'lugares' : 'places'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {language === 'es'
                  ? 'Centro Histórico • Analco • La Luz • El Parián • El Alto • Xanenetla'
                  : 'Accessible Historic & Artisan Map'}
              </p>
            </div>
          </div>

          {/* Selector de Rol y Acciones de Cabecera */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Píldoras de Roles con Enrutamiento Directo */}
            <div className="hidden sm:flex bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                  activeRoute === '/'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Visitante' : 'Visitor'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/taller')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                  activeRoute === '/taller'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Local' : 'Local'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                  activeRoute === '/admin'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Admin' : 'Admin'}</span>
              </button>
            </div>

            {/* Selector de Rol Móvil */}
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className={`sm:hidden px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all duration-300 ${activeRoleDef.theme.badgeBg} ${activeRoleDef.theme.badgeText} ${activeRoleDef.theme.badgeBorder} cursor-pointer`}
              title={language === 'es' ? 'Cambiar rol' : 'Switch role'}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{activeRoleDef.shortTitle[language]}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Simulador móvil vs Pantalla Completa */}
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setViewportMode((v) => (v === 'mobile' ? 'full' : 'mobile'));
              }}
              className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold items-center gap-1 border border-white/10 transition-all duration-300 cursor-pointer"
              title={viewportMode === 'mobile' ? 'Pantalla Completa' : 'Vista Teléfono'}
            >
              {viewportMode === 'mobile' ? (
                <Monitor className="w-3.5 h-3.5" />
              ) : (
                <Smartphone className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Información DENUE y Auditorías */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex items-center border border-white/10 transition-all duration-300 cursor-pointer"
              title={language === 'es' ? 'Acerca de los datos' : 'About data'}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            {/* Selector de Idioma */}
            <button
              type="button"
              onClick={() => {
                const nextLang = language === 'es' ? 'en' : 'es';
                setLanguage(nextLang);
              }}
              className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1 border border-white/10 transition-all duration-300 cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'EN' : 'ES'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Área Principal con Soporte para Vista Simulada 390x844 */}
      <main className="flex-1 w-full relative overflow-hidden flex items-center justify-center">
        <div
          className={
            viewportMode === 'mobile'
              ? 'w-full max-w-[390px] h-[844px] max-h-[calc(100vh-60px)] bg-slate-950 border-[5px] border-slate-800 rounded-[44px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden relative flex flex-col transition-all duration-500'
              : 'w-full h-full relative flex flex-col overflow-hidden transition-all duration-500'
          }
        >
          {viewportMode === 'mobile' && (
            <div className="h-6 w-full bg-slate-950 flex items-center justify-between px-6 z-40 select-none flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-400 font-bold">12:00</span>
              <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                <Radio className="w-3 h-3 text-sky-400" />
                <span>5G</span>
              </div>
            </div>
          )}

          {/* Vistas Cargadas con Code Splitting (React.lazy) según la Ruta Activa */}
          <Suspense
            fallback={
              <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-950">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
                    {language === 'es' ? 'Cargando módulo...' : 'Loading module...'}
                  </span>
                </div>
              </div>
            }
          >
            {activeRoute === '/' && (
              <VisitorView
                pois={pois}
                graph={graph}
                matrices={matrices}
                weights={weights}
                language={language}
                passportState={passportState}
                onUnlockSecret={handleUnlockSecret}
                userLocation={userLocation}
                onUserLocationChange={(coords) => setUserLocation(coords)}
              />
            )}

            {activeRoute === '/taller' && (
              <ArtisanView pois={pois} language={language} />
            )}

            {activeRoute === '/admin' && (
              <AdminView language={language} />
            )}
          </Suspense>
        </div>
      </main>

      {/* Modal Interactivo de Selección de Rol */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-slide">
          <div className="bg-slate-900 border border-white/10 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  {language === 'es' ? 'Seleccionar Perfil de Vista' : 'Select View Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {(Object.keys(USER_ROLES) as UserRole[]).map((roleKey) => {
                const role = USER_ROLES[roleKey];
                const isSelected = currentRole === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleSelectRole(roleKey)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? `${role.theme.badgeBg} ${role.theme.badgeBorder} ring-1 ring-amber-400`
                        : 'bg-slate-950/70 border-white/5 hover:bg-slate-800'
                    }`}
                  >
                    <div className="mt-0.5">
                      {role.iconName === 'Compass' && <Compass className="w-5 h-5 text-amber-400" />}
                      {role.iconName === 'Store' && <Store className="w-5 h-5 text-sky-400" />}
                      {role.iconName === 'BarChart3' && (
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100">
                          {role.name[language]}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {role.description[language]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modales de Transparencia y Celebración */}
      <DataInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        language={language}
      />

      {celebrationData && (
        <CelebrationModal
          isOpen={true}
          onClose={() => setCelebrationData(null)}
          badgeName={celebrationData.badgeName}
          title={celebrationData.title}
          description={celebrationData.description}
          zone={celebrationData.zone}
          language={language}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <MainApp />
    </RouterProvider>
  );
}
