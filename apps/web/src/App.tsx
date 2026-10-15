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
import { RouteComparison } from './components/RouteComparison';
import { StopDetails } from './components/StopDetails';
import { DataInfoModal } from './components/DataInfoModal';
import { ArtisansPortal } from './components/ArtisansPortal';
import { SustainabilityDashboard } from './components/SustainabilityDashboard';
import { USER_ROLES, UserRole, AppMode } from './types/roles';
import {
  Languages,
  Play,
  Square,
  Filter,
  Compass,
  Store,
  BarChart3,
  Download,
  UserCheck,
  ChevronDown,
  Check,
  MapPin,
  SlidersHorizontal,
  ListOrdered,
  X
} from 'lucide-react';

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

  // Modo de vista actual (garantizado que pertenezca a los modos permitidos del rol)
  const [currentMode, setCurrentMode] = useState<AppMode>(() => activeRoleDef.defaultMode);

  // Pestaña móvil activa para la vista de explorador
  const [mobileTab, setMobileTab] = useState<'map' | 'form' | 'stops'>('map');

  // Modal para cambio de rol de usuario
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Estados de datos
  const [pois, setPois] = useState<POI[]>([]);
  const [graph, setGraph] = useState<SidewalkGraph | null>(null);
  const [matrices, setMatrices] = useState<TimeMatrices | null>(null);
  const [weights, setWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExhibitionActive, setIsExhibitionActive] = useState(false);

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

    // En móviles, regresar la vista al mapa para ver el resultado de inmediato
    setMobileTab('map');
  }, [request, graph, matrices, pois, weights]);

  const handleUpdateReq = (updated: Partial<RouteRequest>) => {
    setRequest((prev) => ({ ...prev, ...updated }));
  };

  const handleExportRoute = () => {
    if (!activeRoute) return;
    const textLines = [
      `RUTA ABIERTA PUEBLA - ITINERARIO ACCESIBLE`,
      `Perfil: ${request.profile} | Duración estimada: ${activeRoute.metrics.total_time_min} min | Distancia: ${activeRoute.metrics.distance_meters} m`,
      `Porcentaje de tramos verificados en campo: ${activeRoute.metrics.pct_verified}%`,
      `Gasto estimado en comercios locales: $${activeRoute.metrics.total_cost_mxn} MXN`,
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
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide">
            {language === 'es'
              ? 'Cargando red peatonal de aceras y matrices de Puebla...'
              : 'Loading Puebla sidewalk pedestrian network & matrices...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Encabezado Responsivo */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo y Nombre de la Plataforma */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center text-base sm:text-lg shadow">
              RA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight">
                  Ruta Abierta Puebla
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tech-Capital 2026
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                {language === 'es'
                  ? 'Movilidad accesible, patrimonio y turismo sostenible'
                  : 'Accessible mobility & sustainable living heritage'}
              </p>
            </div>
          </div>

          {/* Selector de Rol y Acciones Rápidas */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Botón Selector de Rol Dinámico */}
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${activeRoleDef.theme.badgeBg} ${activeRoleDef.theme.badgeText} ${activeRoleDef.theme.badgeBorder} hover:brightness-110 shadow-sm`}
              title="Cambiar rol de usuario"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{activeRoleDef.shortTitle[language]}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Modal de Transparencia DENUE */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
              title="Embudo DENUE & Calidad"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{language === 'es' ? 'Embudo DENUE' : 'DENUE'}</span>
            </button>

            {/* Modo Exhibición / Pitch Stand */}
            <button
              onClick={() => setIsExhibitionActive(!isExhibitionActive)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                isExhibitionActive
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title="Modo Stand / Exhibición"
            >
              {isExhibitionActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{language === 'es' ? 'Stand' : 'Demo'}</span>
            </button>

            {/* Selector de Idioma */}
            <button
              onClick={() => {
                const nextLang = language === 'es' ? 'en' : 'es';
                setLanguage(nextLang);
                handleUpdateReq({ language: nextLang });
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 transition"
              aria-label="Cambiar idioma"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'EN' : 'ES'}</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Modos Permitidos para el Rol Activo */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 border-t border-slate-800 flex items-center gap-1.5 py-1.5 overflow-x-auto text-xs scrollbar-none">
          {activeRoleDef.allowedModes.includes('visitor') && (
            <button
              type="button"
              onClick={() => setCurrentMode('visitor')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                currentMode === 'visitor'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>{language === 'es' ? '1. Explorador & Pasaporte' : '1. Explorer & Passport'}</span>
            </button>
          )}

          {activeRoleDef.allowedModes.includes('artisans') && (
            <button
              type="button"
              onClick={() => setCurrentMode('artisans')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                currentMode === 'artisans'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{language === 'es' ? '2. Portal Artesanos de Barrio' : '2. Artisans Portal'}</span>
            </button>
          )}

          {activeRoleDef.allowedModes.includes('sustainability') && (
            <button
              type="button"
              onClick={() => setCurrentMode('sustainability')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                currentMode === 'sustainability'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{language === 'es' ? '3. Sostenibilidad & Destino (Gobierno)' : '3. Sustainability Dashboard'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full space-y-5">
        {/* Banner de Modo Exhibición / Stand si está activo */}
        {isExhibitionActive && (
          <div className="bg-amber-500 text-slate-950 p-3 rounded-xl font-medium text-xs flex items-center justify-between shadow">
            <span>
              <strong>{language === 'es' ? 'Modo Stand Activo:' : 'Demo Stand Active:'}</strong>{' '}
              {language === 'es'
                ? 'Rotación de escenarios accesible, dispersión económica en barrios y cálculo OPTW en tiempo real.'
                : 'Accessible scenario cycling, economic dispersion in neighborhoods, real-time OPTW solving.'}
            </span>
            <button
              onClick={() => setIsExhibitionActive(false)}
              className="text-slate-950 font-bold hover:underline ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* VISTA 1: MODO EXPLORADOR (VISITANTE) */}
        {currentMode === 'visitor' && (
          <div className="space-y-5">
            {/* Barra de Segmentación Móvil (Solo visible en pantallas pequeñas < lg) */}
            <div className="lg:hidden flex rounded-xl bg-slate-200 p-1 border border-slate-300 text-xs font-bold text-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setMobileTab('map')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'map' ? 'bg-slate-900 text-white shadow' : 'hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'es' ? 'Mapa 3D' : '3D Map'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'form' ? 'bg-slate-900 text-white shadow' : 'hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'es' ? 'Ajustes' : 'Filters'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('stops')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'stops' ? 'bg-slate-900 text-white shadow' : 'hover:text-slate-900'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === 'es' ? 'Paradas' : 'Stops'}
                  {activeRoute ? ` (${activeRoute.stops.length})` : ''}
                </span>
              </button>
            </div>

            {/* Estructura Adaptativa: Columnas en desktop / Pestañas en móvil */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Columna Izquierda: Formulario (En móvil condicionado a mobileTab === 'form') */}
              <div
                className={`lg:col-span-5 space-y-5 ${
                  mobileTab === 'form' ? 'block' : 'hidden lg:block'
                }`}
              >
                <RouteForm
                  request={request}
                  onChangeRequest={handleUpdateReq}
                  onGenerate={handleGenerate}
                  pois={pois}
                  language={language}
                />
              </div>

              {/* Columna Derecha: Mapa y Detalles (En móvil condicionado a mobileTab === 'map' o 'stops') */}
              <div
                className={`lg:col-span-7 space-y-5 ${
                  mobileTab === 'map' || mobileTab === 'stops' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* Mapa WebGL 3D (visible en desktop o cuando mobileTab === 'map') */}
                <div className={mobileTab === 'stops' ? 'hidden lg:block' : 'block'}>
                  {graph && (
                    <MapViewer
                      segments={graph.edges}
                      pois={pois}
                      selectedRoute={activeRoute}
                      activeProfile={request.profile}
                      selectedStopPoiId={selectedStopPoiId}
                      onSelectPoi={(id) => setSelectedStopPoiId(id)}
                      language={language}
                    />
                  )}
                </div>

                {/* Resumen de Itinerario y Descarga */}
                {solution && (
                  <div
                    className={`bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-700 shadow-sm space-y-3 ${
                      mobileTab === 'form' ? 'hidden' : 'block'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-amber-600" />
                        <span>{language === 'es' ? 'Explicación de la Ruta' : 'Route Rationale'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportRoute}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'es' ? 'Descargar' : 'Export'}</span>
                      </button>
                    </div>

                    <p className="leading-relaxed">
                      {language === 'es' ? solution.explanation.es : solution.explanation.en}
                    </p>

                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <strong>{language === 'es' ? 'Auditoría en campo:' : 'Field audited:'}</strong>{' '}
                        {activeRoute?.metrics.pct_verified}%
                      </span>
                      <span>
                        <strong>{language === 'es' ? 'Comercios locales:' : 'Local commerce:'}</strong>{' '}
                        {activeRoute?.metrics.pct_local_stops}%
                      </span>
                      <span>
                        <strong>{language === 'es' ? 'Fuera del zócalo:' : 'Outside core:'}</strong>{' '}
                        {activeRoute?.metrics.pct_outside_core}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comparador de Rutas y Paradas (En móvil visible si mobileTab === 'stops' o en desktop) */}
            <div className={mobileTab === 'stops' ? 'block space-y-5' : 'hidden lg:block lg:space-y-5'}>
              {solution && activeRoute && (
                <RouteComparison
                  mainRoute={solution.main_route}
                  alternativeRoutes={solution.alternative_routes}
                  activeRouteName={activeRoute.name}
                  onSelectRoute={(r) => setActiveRoute(r)}
                  language={language}
                />
              )}

              {activeRoute && (
                <StopDetails
                  stops={activeRoute.stops}
                  selectedStopPoiId={selectedStopPoiId}
                  onSelectStop={(id) => setSelectedStopPoiId(id)}
                  language={language}
                  passportState={passportState}
                  onUnlockSecret={handleUnlockSecret}
                />
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: MODO VENDEDORES Y ARTESANOS (COMERCIO LOCAL) */}
        {currentMode === 'artisans' && (
          <ArtisansPortal pois={pois} language={language} />
        )}

        {/* VISTA 3: MODO SOSTENIBILIDAD Y DESTINO (GOBIERNO) */}
        {currentMode === 'sustainability' && (
          <SustainabilityDashboard language={language} />
        )}
      </main>

      {/* Pie de Página Responsivo */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <div>
            <strong>Ruta Abierta Puebla</strong> • Centro Histórico y Barrios Tradicionales
          </div>
          <div className="text-[11px] text-slate-400">
            INEGI DENUE 2026 • OpenStreetMap (ODbL) • Microauditorías CC BY 4.0
          </div>
        </div>
      </footer>

      {/* Modal Interactivo de Selección de Rol Dinámico */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-slate-100">
                  {language === 'es' ? 'Seleccionar Rol de Usuario' : 'Select User Role'}
                </h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'es'
                ? 'El sistema adapta dinámicamente las herramientas, permisos y métricas según el perfil seleccionado:'
                : 'The platform dynamically adapts tools, permissions, and analytics according to the selected profile:'}
            </p>

            <div className="space-y-2.5">
              {(Object.keys(USER_ROLES) as UserRole[]).map((roleKey) => {
                const role = USER_ROLES[roleKey];
                const isSelected = currentRole === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleSelectRole(roleKey)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? `${role.theme.badgeBg} ${role.theme.badgeBorder} ring-1 ring-amber-400`
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
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
    </div>
  );
}
