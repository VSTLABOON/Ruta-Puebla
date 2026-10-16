import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  POI,
  SidewalkGraph,
  TimeMatrices,
  RouteRequest,
  RouteResponse,
  RouteAlternative,
  PassportState,
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
  Radio
} from 'lucide-react';
import { tacticalAudio } from './utils/tacticalAudio';

export default function App() {
  // Sistema dinámico de roles de usuario
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_role');
      if (saved && saved in USER_ROLES) return saved as UserRole;
    } catch {}
    return 'tourist';
  });

  const activeRoleDef = useMemo(() => USER_ROLES[currentRole], [currentRole]);

  // Modo de vista actual
  const [currentMode, setCurrentMode] = useState<AppMode>(() => activeRoleDef.defaultMode);

  // Centro de mando móvil (Pestañas tácticas: 'explore' | 'itinerary' | 'passport' | 'artisans')
  const [commandTab, setCommandTab] = useState<CommandTab>('explore');

  // Estado del Bottom Sheet deslizable
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Modo de visualización: Marco Móvil 390x844 o Pantalla Completa
  const [viewportMode, setViewportMode] = useState<'mobile' | 'full'>('full');

  // Panel deslizable de filtros / parámetros de ruta
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Estado de pulso urbano (radar activo)
  const [isPulseActive, setIsPulseActive] = useState(false);

  // Modales
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    badgeName: string;
    title: string;
    description: string;
    zone: string;
  } | null>(null);

  // Estados de datos
  const [pois, setPois] = useState<POI[]>([]);
  const [graph, setGraph] = useState<SidewalkGraph | null>(null);
  const [matrices, setMatrices] = useState<TimeMatrices | null>(null);
  const [weights, setWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Pasaporte de Exploración dinámico en LocalStorage
  const [passportState, setPassportState] = useState<PassportState>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_passport');
      return saved ? JSON.parse(saved) : { unlocked_secrets: [], visited_poi_ids: [], collected_badges: [] };
    } catch {
      return { unlocked_secrets: [], visited_poi_ids: [], collected_badges: [] };
    }
  });

  const handleUnlockSecret = (poiId: string, badgeName: string) => {
    setPassportState((prev) => {
      const newSecrets = prev.unlocked_secrets.includes(poiId) ? prev.unlocked_secrets : [...prev.unlocked_secrets, poiId];
      const newBadges = prev.collected_badges.includes(badgeName) ? prev.collected_badges : [...prev.collected_badges, badgeName];
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

  // Parámetros dinámicos de solicitud de ruta
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

  const [solution, setSolution] = useState<RouteResponse | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteAlternative | null>(null);
  const [selectedStopPoiId, setSelectedStopPoiId] = useState<string | null>(null);

  // Carga inicial de datos estáticos
  useEffect(() => {
    async function loadStaticData() {
      try {
        const [poisRes, graphRes, matricesRes, weightsRes] = await Promise.all([
          fetch('/data/pois.json').then((r) => r.json()),
          fetch('/data/sidewalk_graph.json').then((r) => r.json()),
          fetch('/data/time_matrices.json').then((r) => r.json()),
          fetch('/data/choice_model_weights.json').then((r) => r.json())
        ]);

        setPois(poisRes);
        setGraph(graphRes);
        setMatrices(matricesRes);
        setWeights(weightsRes);

        const initialSolution = solveOPTW(request, poisRes, matricesRes, graphRes, {
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
        console.error('Error cargando artefactos:', err);
        setIsLoading(false);
      }
    }

    loadStaticData();
  }, []);

  // Cambio dinámico de rol
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

  // Generar ruta bajo demanda con la heurística OPTW
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

  // Trigger de Pulso Urbano (Sonar radar a 50m)
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
  };

  const handleSelectTab = (tab: CommandTab) => {
    if (tab === 'itinerary') {
      setIsBottomSheetOpen((prev) => !prev);
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
      `RUTA ABIERTA PUEBLA - ITINERARIO ACCESIBLE`,
      `Perfil: ${request.profile} | Duración: ${activeRoute.metrics.total_time_min} min | Distancia: ${activeRoute.metrics.distance_meters} m`,
      `Auditoría de aceras verificadas en campo: ${activeRoute.metrics.pct_verified}%`,
      `Gasto en comercios tradicionales de barrio: $${activeRoute.metrics.total_cost_mxn} MXN`,
      ``,
      `PARADAS PROGRAMADAS:`,
      ...activeRoute.stops.map((s) => {
        const hArr = Math.floor(s.arrival_time_min / 60).toString().padStart(2, '0');
        const mArr = (s.arrival_time_min % 60).toString().padStart(2, '0');
        const hDep = Math.floor(s.departure_time_min / 60).toString().padStart(2, '0');
        const mDep = (s.departure_time_min % 60).toString().padStart(2, '0');
        return `[${s.stop_order}] ${hArr}:${mArr} - ${hDep}:${mDep} | ${s.poi.name} (${s.poi.address})\n    - Accesibilidad: ${s.poi.entrance_accessible ? 'Entrada al nivel de banqueta' : 'Escalón sin rampa'}\n    - Notas: ${s.poi.description[language] || s.poi.description.es}`;
      })
    ];

    const blob = new Blob([textLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `itinerario_accesible_puebla_${request.profile}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-amber-400">
            {language === 'es'
              ? 'Iniciando Sistema Operativo de Patrimonio Urbano...'
              : 'Initializing Augmented Heritage OS...'}
          </p>
        </div>
      </div>
    );
  }

  // App Wrapper
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Encabezado Táctico Principal */}
      <header className="bg-slate-950/90 backdrop-blur-xl border-b border-white/10 text-white sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo y Nombre de la Plataforma */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(245,158,11,0.5)] flex-shrink-0">
              RA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white uppercase">
                  Ruta Abierta Puebla
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Heritage OS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden xs:block">
                {language === 'es'
                  ? 'Analco • La Luz • El Parián • El Alto • Xanenetla'
                  : 'Accessible Pedestrian Heritage'}
              </p>
            </div>
          </div>

          {/* Selector de Rol y Acciones Tácticas */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Selector de Rol Dinámico en Cabecera */}
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${activeRoleDef.theme.badgeBg} ${activeRoleDef.theme.badgeText} ${activeRoleDef.theme.badgeBorder} hover:brightness-110 shadow-sm cursor-pointer`}
              title="Cambiar rol de usuario"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{activeRoleDef.shortTitle[language]}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Toggle de Viewport: Móvil 390x844 vs Pantalla Completa */}
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setViewportMode((v) => (v === 'mobile' ? 'full' : 'mobile'));
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-mono font-semibold flex items-center gap-1 border border-white/10 transition cursor-pointer"
              title={viewportMode === 'mobile' ? 'Pantalla Completa' : 'Simulador Móvil 390x844'}
            >
              {viewportMode === 'mobile' ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">
                {viewportMode === 'mobile' ? 'Full View' : '390×844'}
              </span>
            </button>

            {/* Modal de Transparencia DENUE */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-white/10 transition cursor-pointer"
              title="Embudo DENUE & Auditorías"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            {/* Selector de Idioma */}
            <button
              type="button"
              onClick={() => {
                const nextLang = language === 'es' ? 'en' : 'es';
                setLanguage(nextLang);
                handleUpdateReq({ language: nextLang });
              }}
              className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center gap-1 border border-white/10 transition cursor-pointer"
              aria-label="Cambiar idioma"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'EN' : 'ES'}</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Modos Permitidos para el Rol Activo (Desktop / Navegación rápida) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 border-t border-white/5 flex items-center gap-1.5 py-1.5 overflow-x-auto text-xs scrollbar-none">
          {activeRoleDef.allowedModes.includes('visitor') && (
            <button
              type="button"
              onClick={() => {
                setCurrentMode('visitor');
                setCommandTab('explore');
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                currentMode === 'visitor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{language === 'es' ? '1. Explorador Táctico' : '1. Tactical Explorer'}</span>
            </button>
          )}

          {activeRoleDef.allowedModes.includes('artisans') && (
            <button
              type="button"
              onClick={() => {
                setCurrentMode('artisans');
                setCommandTab('artisans');
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                currentMode === 'artisans'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{language === 'es' ? '2. Portal Artesanos' : '2. Artisans Portal'}</span>
            </button>
          )}

          {activeRoleDef.allowedModes.includes('sustainability') && (
            <button
              type="button"
              onClick={() => setCurrentMode('sustainability')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                currentMode === 'sustainability'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{language === 'es' ? '3. Analítica SECIHTI' : '3. SECIHTI Analytics'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal con Adaptabilidad Responsiva */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-0 sm:py-3 lg:px-4">
        <div
          className={
            viewportMode === 'mobile'
              ? 'w-full max-w-[390px] min-h-[844px] h-[844px] bg-slate-950 border-[5px] border-slate-800 rounded-[44px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden relative flex flex-col'
              : 'w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 flex-1 flex flex-col relative min-h-[680px] h-[calc(100vh-105px)]'
          }
        >
          {/* Muesca Superior en Modo Móvil Simulado */}
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

          {/* VISTA 1: MODO EXPLORADOR TÁCTICO */}
          {currentMode === 'visitor' && (
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Barra Rápida Superior de Controles de Ruta */}
              <div className="px-3 sm:px-4 py-2 bg-slate-950/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between gap-2 z-20 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] sm:text-xs uppercase font-bold text-amber-400">
                    {request.profile.replace(/_/g, ' ')}
                  </span>
                  {activeRoute && (
                    <span className="text-[11px] sm:text-xs font-mono text-slate-400">
                      • {activeRoute.stops.length} {language === 'es' ? 'paradas' : 'stops'} • {activeRoute.metrics.total_time_min}m
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'es' ? 'Filtros' : 'Tune'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportRoute}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Exportar Itinerario"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">{language === 'es' ? 'Exportar' : 'Export'}</span>
                  </button>
                </div>
              </div>

              {/* Vistas según la pestaña activa del Centro de Mando */}
              <div className="flex-1 relative overflow-y-auto">
                {/* PESTAÑA EXPLORAR: MAPA 3D VECTORIAL + SPLIT VIEW EN DESKTOP */}
                {commandTab === 'explore' && graph && (
                  <div className="w-full h-full min-h-[500px] flex-1 relative">
                    {viewportMode === 'full' ? (
                      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch relative">
                        {/* Panel Táctico Lateral Desktop (Oculto en pantallas pequeñas) */}
                        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 h-full min-h-[600px] pb-24">
                          {activeRoute && (
                            <TacticalDesktopPanel
                              stops={activeRoute.stops}
                              selectedStopPoiId={selectedStopPoiId}
                              onSelectStop={(id) => setSelectedStopPoiId(id)}
                              language={language}
                              passportState={passportState}
                              onUnlockSecret={handleUnlockSecret}
                              explanation={solution ? solution.explanation : undefined}
                            />
                          )}
                        </div>

                        {/* Visor de Mapa WebGL 3D (Adaptable: ancho total en móvil, 7/8 columnas en desktop) */}
                        <div className="col-span-1 lg:col-span-7 xl:col-span-8 h-full min-h-[480px] lg:min-h-[600px] pb-24 lg:pb-24 relative">
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
                          />
                        </div>
                      </div>
                    ) : (
                      /* Modo Móvil Simulado 390x844 */
                      <div className="w-full h-full min-h-[500px] pb-24 relative">
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
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA PASAPORTE: GALERÍA DE INSIGNIAS HOLOGRÁFICAS */}
                {commandTab === 'passport' && (
                  <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full">
                    <PassportGallery
                      pois={pois}
                      passportState={passportState}
                      onUnlockSecret={handleUnlockSecret}
                      language={language}
                    />
                  </div>
                )}

                {/* PESTAÑA TALLERES: DIRECTORIO DE ARTESANOS EN VIVO */}
                {commandTab === 'artisans' && (
                  <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full">
                    <ArtisanDirectory
                      pois={pois}
                      onSelectArtisan={(poiId) => {
                        setSelectedStopPoiId(poiId);
                        setCommandTab('explore');
                        setIsBottomSheetOpen(true);
                      }}
                      language={language}
                    />
                  </div>
                )}
              </div>

              {/* BOTTOM SHEET DESLIZABLE TÁCTICO (En móvil o modo simulado) */}
              {activeRoute && (
                <div className={viewportMode === 'full' ? 'lg:hidden' : 'block'}>
                  <TacticalBottomSheet
                    stops={activeRoute.stops}
                    selectedStopPoiId={selectedStopPoiId}
                    onSelectStop={(id) => setSelectedStopPoiId(id)}
                    isOpen={isBottomSheetOpen}
                    onClose={() => setIsBottomSheetOpen(false)}
                    language={language}
                    passportState={passportState}
                    onUnlockSecret={handleUnlockSecret}
                  />
                </div>
              )}

              {/* CENTRO DE MANDO INFERIOR (Mobile Bottom Command Center) */}
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

          {/* VISTA 2: PORTAL DE ARTESANOS Y COMERCIO LOCAL */}
          {currentMode === 'artisans' && (
            <div className="flex-1 p-4 overflow-y-auto pb-24">
              <ArtisansPortal pois={pois} language={language} />
            </div>
          )}

          {/* VISTA 3: GOBIERNO / SOSTENIBILIDAD Y PLANIFICACIÓN */}
          {currentMode === 'sustainability' && (
            <div className="flex-1 p-4 overflow-y-auto pb-24">
              <SustainabilityDashboard language={language} />
            </div>
          )}

          {/* Barra de Home Indicator en Móvil Simulado */}
          {viewportMode === 'mobile' && (
            <div className="h-4 w-full bg-slate-950 flex items-center justify-center flex-shrink-0 z-50">
              <div className="w-32 h-1 bg-slate-700 rounded-full" />
            </div>
          )}
        </div>
      </main>

      {/* Drawer Deslizable de Filtros de Ruta */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-950 border-l border-white/10 h-full overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                  {language === 'es' ? 'Ajustes del Itinerario' : 'Route Tuning'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {solution && (
              <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/5 text-xs text-slate-300 font-mono space-y-1.5">
                <span className="font-bold text-amber-400 block text-[11px] uppercase tracking-wider">
                  {language === 'es' ? 'Explicación del Algoritmo OPTW:' : 'OPTW Algorithm Rationale:'}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 font-sans">
                  {language === 'es' ? solution.explanation.es : solution.explanation.en}
                </p>
              </div>
            )}

            <RouteForm
              request={request}
              onChangeRequest={handleUpdateReq}
              onGenerate={handleGenerate}
              pois={pois}
              language={language}
            />
          </div>
        </div>
      )}

      {/* Modal Interactivo de Selección de Rol Dinámico */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  {language === 'es' ? 'Seleccionar Rol de Usuario' : 'Select User Role'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                title="Cerrar"
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
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? `${role.theme.badgeBg} ${role.theme.badgeBorder} ring-1 ring-amber-400`
                        : 'bg-slate-950/70 border-white/5 hover:bg-slate-800'
                    }`}
                  >
                    <div className="mt-0.5">
                      {role.iconName === 'Compass' && <Compass className="w-5 h-5 text-amber-400" />}
                      {role.iconName === 'Store' && <Store className="w-5 h-5 text-sky-400" />}
                      {role.iconName === 'BarChart3' && <BarChart3 className="w-5 h-5 text-emerald-400" />}
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

      {/* Modal de Transparencia, Embudo DENUE y Normas */}
      <DataInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        language={language}
      />

      {/* Modal de Celebración al desbloquear sellos/insignias */}
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
