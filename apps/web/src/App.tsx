import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  POI,
  SidewalkGraph,
  TimeMatrices,
  RouteRequest,
  RouteResponse,
  RouteAlternative,
  PassportState,
  MobilityProfile,
  solveOPTW
} from '@ruta-abierta/shared-types';
import { MapViewer } from './components/MapViewer';
import { RouteForm } from './components/RouteForm';
import { DataInfoModal } from './components/DataInfoModal';
import { CelebrationModal } from './components/CelebrationModal';
import { ArtisansPortal } from './components/ArtisansPortal';
import { SustainabilityDashboard } from './components/SustainabilityDashboard';
import { MobileBottomNav, CommandTab } from './components/MobileBottomNav';
import { TacticalBottomSheet } from './components/TacticalBottomSheet';
import { TacticalDesktopPanel } from './components/TacticalDesktopPanel';
import { PassportGallery } from './components/PassportGallery';
import { ArtisanDirectory } from './components/ArtisanDirectory';
import { USER_ROLES, UserRole, AppMode } from './types/roles';
import {
  Languages,
  Filter,
  Compass,
  Store,
  BarChart3,
  Download,
  UserCheck,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Smartphone,
  Monitor,
  X,
  Radio,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { tacticalAudio } from './utils/tacticalAudio';

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

export default function App() {
  // Rol de usuario
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_role');
      if (saved && saved in USER_ROLES) return saved as UserRole;
    } catch {}
    return 'tourist';
  });

  const activeRoleDef = useMemo(() => USER_ROLES[currentRole], [currentRole]);
  const [currentMode, setCurrentMode] = useState<AppMode>(() => activeRoleDef.defaultMode);
  const [commandTab, setCommandTab] = useState<CommandTab>('explore');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [viewportMode, setViewportMode] = useState<'mobile' | 'full'>('full');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);

  // Ubicación actual del usuario en el mapa (Por defecto: Zócalo de Puebla)
  const [userLocation, setUserLocation] = useState<[number, number]>([-98.198, 19.0431]);

  // Modales
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    badgeName: string;
    title: string;
    description: string;
    zone: string;
  } | null>(null);

  // Datos
  const [pois, setPois] = useState<POI[]>([]);
  const [graph, setGraph] = useState<SidewalkGraph | null>(null);
  const [matrices, setMatrices] = useState<TimeMatrices | null>(null);
  const [weights, setWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Pasaporte
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

  const [request, setRequest] = useState<RouteRequest>({
    profile: 'sin_restriccion',
    max_time_min: 180,
    max_budget_mxn: 250,
    interests: ['patrimonio', 'gastronomia', 'artesania'],
    language: 'es',
    start_poi_id: 'poi_catedral',
    balance_local_pct: 60,
    free_text: ''
  });

  const [, setSolution] = useState<RouteResponse | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteAlternative | null>(null);
  const [selectedStopPoiId, setSelectedStopPoiId] = useState<string | null>(null);

  // Carga inicial con cache-busting para Brave y navegadores estrictos
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

        const enrichedMatrices = enrichTimeMatrices(poisRes, matricesRes);

        setPois(poisRes);
        setGraph(graphRes);
        setMatrices(enrichedMatrices);
        setWeights(weightsRes);

        const initialSolution = solveOPTW(request, poisRes, enrichedMatrices, graphRes, {
          weights: {
            w_interes: weightsRes.pesos_puntaje_parada_S_i.w_interes.valor_defecto,
            w_presupuesto: weightsRes.pesos_puntaje_parada_S_i.w_presupuesto.valor_defecto,
            w_dispersion: weightsRes.pesos_puntaje_parada_S_i.w_dispersion.valor_defecto,
            w_local: weightsRes.pesos_puntaje_parada_S_i.w_local.valor_defecto
          }
        });

        setSolution(initialSolution);
        setActiveRoute(initialSolution.main_route);
        setIsLoading(false);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setIsLoading(false);
      }
    }

    loadStaticData();
  }, []);

  const handleSelectRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    try {
      localStorage.setItem('ruta_abierta_role', newRole);
    } catch {}

    const newDef = USER_ROLES[newRole];
    if (!newDef.allowedModes.includes(currentMode)) {
      setCurrentMode(newDef.defaultMode);
    }
    setIsRoleModalOpen(false);
  };

  const handleGenerate = useCallback(() => {
    if (!graph || !matrices || pois.length === 0) return;

    const optWeights = weights
      ? {
          w_interes: weights.pesos_puntaje_parada_S_i.w_interes.valor_defecto,
          w_presupuesto: weights.pesos_puntaje_parada_S_i.w_presupuesto.valor_defecto,
          w_dispersion: weights.pesos_puntaje_parada_S_i.w_dispersion.valor_defecto,
          w_local: weights.pesos_puntaje_parada_S_i.w_local.valor_defecto
        }
      : undefined;

    const res = solveOPTW(request, pois, matrices, graph, { weights: optWeights });
    setSolution(res);
    setActiveRoute(res.main_route);
    setSelectedStopPoiId(null);
    setIsFilterDrawerOpen(false);
    setCommandTab('explore');
  }, [request, graph, matrices, pois, weights]);

  const handleUpdateReq = (updated: Partial<RouteRequest>) => {
    setRequest((prev) => ({ ...prev, ...updated }));
  };

  const handleTriggerUrbanPulse = () => {
    setIsPulseActive(true);
    tacticalAudio.playUrbanPulse();
    setTimeout(() => {
      setIsPulseActive(false);
    }, 2800);
  };

  const handleInspectStop = (poiId: string) => {
    setSelectedStopPoiId(poiId);
    setIsBottomSheetOpen(true);
    setIsDesktopPanelOpen(true);
  };

  const handleSelectTab = (tab: CommandTab) => {
    if (tab === 'itinerary') {
      setIsBottomSheetOpen((prev) => !prev);
      setIsDesktopPanelOpen(true);
      setCommandTab('explore');
    } else {
      setCommandTab(tab);
      if (tab !== 'explore') {
        setIsBottomSheetOpen(false);
      }
    }
  };

  const handleExportRoute = () => {
    if (!activeRoute) return;
    const textLines = [
      `RUTA ABIERTA PUEBLA - GUÍA DE RECORRIDO PEATONAL`,
      `Duración estimada: ${activeRoute.metrics.total_time_min} min | Distancia: ${activeRoute.metrics.distance_meters} m`,
      `Presupuesto estimado: $${activeRoute.metrics.total_cost_mxn} MXN`,
      ``,
      `LUGARES DE TU RECORRIDO:`,
      ...activeRoute.stops.map((s) => {
        const hArr = Math.floor(s.arrival_time_min / 60).toString().padStart(2, '0');
        const mArr = (s.arrival_time_min % 60).toString().padStart(2, '0');
        const hDep = Math.floor(s.departure_time_min / 60).toString().padStart(2, '0');
        const mDep = (s.departure_time_min % 60).toString().padStart(2, '0');
        return `[${s.stop_order}] ${hArr}:${mArr} - ${hDep}:${mDep} | ${s.poi.name} (${s.poi.address})\n    - Entrada: ${s.poi.entrance_accessible ? 'Plana sin escalones' : 'Cuenta con escalón'}\n    - Descripción: ${s.poi.description[language] || s.poi.description.es}`;
      })
    ];

    const blob = new Blob([textLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recorrido_puebla_${request.profile}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
      {/* Cabecera Compacta */}
      <header className="bg-slate-950/90 backdrop-blur-xl border-b border-white/10 text-white z-40 flex-shrink-0">
        <div className="w-full px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(245,158,11,0.5)] flex-shrink-0">
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

          {/* Controles rápidos de ruta y vista en cabecera */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentMode === 'visitor' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Personalizar Ruta' : 'Customize'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportRoute}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                  title={language === 'es' ? 'Descargar guía en texto' : 'Download route guide'}
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden lg:inline">{language === 'es' ? 'Guardar' : 'Save'}</span>
                </button>
              </>
            )}

            {/* Selector de Rol */}
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all duration-300 ${activeRoleDef.theme.badgeBg} ${activeRoleDef.theme.badgeText} ${activeRoleDef.theme.badgeBorder} hover:brightness-110 cursor-pointer`}
              title={language === 'es' ? 'Cambiar perfil de vista' : 'Switch role'}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{activeRoleDef.shortTitle[language]}</span>
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

            {/* Información de datos */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex items-center border border-white/10 transition-all duration-300 cursor-pointer"
              title={language === 'es' ? 'Acerca de los datos' : 'About data'}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            {/* Idioma */}
            <button
              type="button"
              onClick={() => {
                const nextLang = language === 'es' ? 'en' : 'es';
                setLanguage(nextLang);
                handleUpdateReq({ language: nextLang });
              }}
              className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1 border border-white/10 transition-all duration-300 cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'EN' : 'ES'}</span>
            </button>
          </div>
        </div>

        {/* Sub-barra de modos sólo cuando el rol tiene múltiples portales */}
        {activeRoleDef.allowedModes.length > 1 && (
          <div className="px-3 sm:px-5 border-t border-white/5 flex items-center gap-1.5 py-1 overflow-x-auto text-xs scrollbar-none">
            {activeRoleDef.allowedModes.includes('visitor') && (
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('visitor');
                  setCommandTab('explore');
                }}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  currentMode === 'visitor'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Mapa y Recorrido' : 'Map & Route'}</span>
              </button>
            )}

            {activeRoleDef.allowedModes.includes('artisans') && (
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('artisans');
                  setCommandTab('artisans');
                }}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  currentMode === 'artisans'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Portal de Artesanos' : 'Artisans Portal'}</span>
              </button>
            )}

            {activeRoleDef.allowedModes.includes('sustainability') && (
              <button
                type="button"
                onClick={() => setCurrentMode('sustainability')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  currentMode === 'sustainability'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Panel de Gestión' : 'Analytics'}</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Área Principal: Mapa de Pantalla Completa */}
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

          {/* MODO EXPLORADOR: MAPA A PANTALLA COMPLETA PERMANENTE */}
          {currentMode === 'visitor' && (
            <div className="flex-1 w-full h-full relative overflow-hidden">
              {/* Lienzo 100% Pantalla Completa del Mapa 3D */}
              {graph && (
                <div className="absolute inset-0 w-full h-full z-0">
                  <MapViewer
                    segments={graph.edges}
                    pois={pois}
                    selectedRoute={activeRoute}
                    activeProfile={request.profile}
                    selectedStopPoiId={selectedStopPoiId}
                    onSelectPoi={(id) => setSelectedStopPoiId(id)}
                    onInspectStop={handleInspectStop}
                    isPulseActive={isPulseActive}
                    language={language}
                    userLocation={userLocation}
                    onUserLocationChange={(coords) => setUserLocation(coords)}
                  />
                </div>
              )}

              {/* Panel Lateral Flotante en Escritorio con transición suave */}
              {viewportMode === 'full' && activeRoute && (
                <>
                  <div
                    className={`hidden lg:block absolute top-16 left-4 bottom-24 w-[390px] z-20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isDesktopPanelOpen && commandTab === 'explore'
                        ? 'translate-x-0 opacity-100 pointer-events-auto'
                        : '-translate-x-[420px] opacity-0 pointer-events-none'
                    }`}
                  >
                    <TacticalDesktopPanel
                      stops={activeRoute.stops}
                      pois={pois}
                      selectedStopPoiId={selectedStopPoiId}
                      onSelectStop={(id) => setSelectedStopPoiId(id)}
                      language={language}
                      passportState={passportState}
                      onUnlockSecret={handleUnlockSecret}
                      onMoveUserHere={(coords) => setUserLocation(coords)}
                    />
                  </div>

                  {/* Botón para mostrar/ocultar el panel flotante en escritorio */}
                  {commandTab === 'explore' && (
                    <button
                      type="button"
                      onClick={() => setIsDesktopPanelOpen((v) => !v)}
                      className={`hidden lg:flex fixed bottom-6 left-4 z-30 px-3 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-white/15 shadow-2xl items-center gap-2 text-xs font-bold transition-all duration-300 cursor-pointer`}
                    >
                      {isDesktopPanelOpen ? (
                        <>
                          <PanelLeftClose className="w-4 h-4 text-amber-400" />
                          <span>{language === 'es' ? 'Ocultar ficha' : 'Hide panel'}</span>
                        </>
                      ) : (
                        <>
                          <PanelLeftOpen className="w-4 h-4 text-amber-400" />
                          <span>{language === 'es' ? 'Ver ficha del lugar' : 'Show place card'}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Overlay Suave: Pasaporte de Sellos */}
              <div
                className={`absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-xl overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  commandTab === 'passport'
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
              >
                <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
                  <PassportGallery
                    pois={pois}
                    passportState={passportState}
                    onUnlockSecret={handleUnlockSecret}
                    language={language}
                  />
                </div>
              </div>

              {/* Overlay Suave: Directorio de Talleres Artesanales */}
              <div
                className={`absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-xl overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  commandTab === 'artisans'
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
              >
                <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
                  <ArtisanDirectory
                    pois={pois}
                    onSelectArtisan={(poiId) => {
                      setSelectedStopPoiId(poiId);
                      setCommandTab('explore');
                      setIsBottomSheetOpen(true);
                      setIsDesktopPanelOpen(true);
                    }}
                    language={language}
                  />
                </div>
              </div>

              {/* Bottom Sheet Deslizable (Móvil y Tablets) */}
              {activeRoute && (
                <div className={viewportMode === 'full' ? 'lg:hidden' : 'block'}>
                  <TacticalBottomSheet
                    stops={activeRoute.stops}
                    pois={pois}
                    selectedStopPoiId={selectedStopPoiId}
                    onSelectStop={(id) => setSelectedStopPoiId(id)}
                    isOpen={isBottomSheetOpen}
                    onClose={() => setIsBottomSheetOpen(false)}
                    language={language}
                    passportState={passportState}
                    onUnlockSecret={handleUnlockSecret}
                    onMoveUserHere={(coords) => setUserLocation(coords)}
                  />
                </div>
              )}

              {/* Barra Inferior de Navegación */}
              <MobileBottomNav
                activeTab={commandTab}
                onSelectTab={handleSelectTab}
                onUrbanPulse={handleTriggerUrbanPulse}
                isPulseActive={isPulseActive}
                unlockedCount={passportState.unlocked_secrets.length}
                language={language}
              />
            </div>
          )}

          {/* VISTA 2: PORTAL DE ARTESANOS */}
          {currentMode === 'artisans' && (
            <div className="flex-1 p-4 overflow-y-auto pb-24 animate-fade-slide">
              <ArtisansPortal pois={pois} language={language} />
            </div>
          )}

          {/* VISTA 3: PANEL DE GESTIÓN */}
          {currentMode === 'sustainability' && (
            <div className="flex-1 p-4 overflow-y-auto pb-24 animate-fade-slide">
              <SustainabilityDashboard language={language} />
            </div>
          )}
        </div>
      </main>

      {/* Panel Deslizable de Personalización de Ruta con transición suave */}
      <div
        className={`fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-end transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isFilterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsFilterDrawerOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md bg-slate-950 border-l border-white/15 h-full overflow-y-auto p-5 shadow-2xl space-y-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                {language === 'es' ? 'Personalizar Recorrido' : 'Customize Walk'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(false)}
              className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <RouteForm
            request={request}
            onChangeRequest={handleUpdateReq}
            onGenerate={handleGenerate}
            pois={pois}
            language={language}
          />
        </div>
      </div>

      {/* Modal de Selección de Rol */}
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
