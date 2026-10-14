import { useState, useEffect, useCallback } from 'react';
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
import {
  Languages,
  Play,
  Square,
  Filter,
  ShieldCheck,
  Compass,
  Store,
  BarChart3,
  Download
} from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'visitor' | 'artisans' | 'sustainability'>('visitor');
  const [pois, setPois] = useState<POI[]>([]);
  const [graph, setGraph] = useState<SidewalkGraph | null>(null);
  const [matrices, setMatrices] = useState<TimeMatrices | null>(null);
  const [weights, setWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExhibitionActive, setIsExhibitionActive] = useState(false);

  // Estado del Pasaporte de Exploración (estilo Pokémon GO)
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

  // Solicitud de ruta
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

  // Respuesta de ruta y seleccion activa
  const [solution, setSolution] = useState<RouteResponse | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteAlternative | null>(null);
  const [selectedStopPoiId, setSelectedStopPoiId] = useState<string | null>(null);

  // Carga inicial de datos estaticos locales
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

        // Generar primera ruta automatica con datos cargados
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
        console.error('Error cargando artefactos estaticos:', err);
        setIsLoading(false);
      }
    }

    loadStaticData();
  }, []);

  // Generar ruta bajo demanda con la heuristica OPTW
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
  }, [request, graph, matrices, pois, weights]);

  // Actualizar parametros del formulario
  const handleUpdateReq = (updated: Partial<RouteRequest>) => {
    setRequest((prev) => ({ ...prev, ...updated }));
  };

  // Exportar itinerario accesible
  const handleExportRoute = () => {
    if (!activeRoute) return;
    const textLines = [
      `RUTA ABIERTA PUEBLA - ITINERARIO ACCESIBLE`,
      `Perfil: ${request.profile} | Duracion estimada: ${activeRoute.metrics.total_time_min} min | Distancia: ${activeRoute.metrics.distance_meters} m`,
      `Porcentaje de tramos verificados en campo: ${activeRoute.metrics.pct_verified}%`,
      `Gasto estimado en comercios locales: $${activeRoute.metrics.total_cost_mxn} MXN`,
      ``,
      `PARADAS PROGRAMADAS:`,
      ...activeRoute.stops.map((s) => {
        const hArr = Math.floor(s.arrival_time_min / 60).toString().padStart(2, '0');
        const mArr = (s.arrival_time_min % 60).toString().padStart(2, '0');
        const hDep = Math.floor(s.departure_time_min / 60).toString().padStart(2, '0');
        const mDep = (s.departure_time_min % 60).toString().padStart(2, '0');
        return `[${s.stop_order}] ${hArr}:${mArr} - ${hDep}:${mDep} | ${s.poi.name} (${s.poi.address})\n    - Accesibilidad: ${s.poi.entrance_accessible ? 'Entrada al nivel de banqueta' : 'Escalon sin rampa'}\n    - Notas: ${s.poi.description.es}`;
      })
    ];
    const blob = new Blob([textLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itinerario_ruta_abierta_${request.profile}.txt`;
    a.click();
  };

  // Modo stand / exhibicion interactiva (rotacion de perfiles)
  useEffect(() => {
    if (!isExhibitionActive) return;

    const profilesList = ['sin_restriccion', 'movilidad_reducida', 'silla_de_ruedas'] as const;
    let currIdx = 0;

    const timer = setInterval(() => {
      currIdx = (currIdx + 1) % profilesList.length;
      const nextProfile = profilesList[currIdx];
      setRequest((prev) => {
        const nextReq = {
          ...prev,
          profile: nextProfile,
          balance_local_pct: currIdx === 0 ? 30 : currIdx === 1 ? 60 : 80
        };
        if (graph && matrices && pois.length > 0) {
          const res = solveOPTW(nextReq, pois, matrices, graph);
          setSolution(res);
          setActiveRoute(res.main_route);
        }
        return nextReq;
      });
    }, 12000);

    return () => clearInterval(timer);
  }, [isExhibitionActive, graph, matrices, pois]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide">
            Cargando red peatonal de aceras y matrices de Puebla...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Barra superior de encabezado */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center text-lg">
              RA
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold tracking-tight">
                Ruta Abierta Puebla
              </h1>
              <p className="text-[11px] text-slate-400">
                {language === 'es'
                  ? 'Movilidad peatonal accesible, patrimonio vivo y turismo sostenible en Puebla'
                  : 'Accessible pedestrian mobility, living heritage & sustainable tourism in Puebla'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modal de transparencia y embudo DENUE */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              aria-label="Informacion de datos y normas"
            >
              <Filter className="w-3.5 h-3.5" />
              {language === 'es' ? 'Embudo DENUE & Normas' : 'DENUE Funnel & Norms'}
            </button>

            {/* Boton modo exhibicion */}
            <button
              onClick={() => setIsExhibitionActive(!isExhibitionActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                isExhibitionActive
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isExhibitionActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
              {language === 'es' ? 'Modo Stand' : 'Stand Demo'}
            </button>

            {/* Alternar idioma */}
            <button
              onClick={() => {
                const nextLang = language === 'es' ? 'en' : 'es';
                setLanguage(nextLang);
                handleUpdateReq({ language: nextLang });
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              aria-label="Cambiar idioma"
            >
              <Languages className="w-3.5 h-3.5" />
              {language === 'es' ? 'EN' : 'ES'}
            </button>
          </div>
        </div>

        {/* Barra de navegacion de los Tres Modos Turisticos */}
        <div className="max-w-7xl mx-auto px-4 border-t border-slate-800 flex items-center gap-2 py-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setCurrentMode('visitor')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              currentMode === 'visitor'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            {language === 'es' ? '1. Explorador (Visitante & Pasaporte)' : '1. Explorer (Visitor & Passport)'}
          </button>

          <button
            type="button"
            onClick={() => setCurrentMode('artisans')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              currentMode === 'artisans'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            {language === 'es' ? '2. Vendedores & Artesanos (Comercio Local)' : '2. Merchants & Artisans'}
          </button>

          <button
            type="button"
            onClick={() => setCurrentMode('sustainability')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              currentMode === 'sustainability'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {language === 'es' ? '3. Sostenibilidad & Destino (Gobierno)' : '3. Destination Sustainability'}
          </button>
        </div>
      </header>

      {/* Contenido principal segun el modo seleccionado */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* Banner de estatus del prototipo */}
        <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-200">
                {language === 'es' ? 'Sistema 100% Autónomo y Desconectado:' : '100% Autonomous Offline-First Mode:'}
              </span>{' '}
              <span className="text-slate-400">
                {language === 'es'
                  ? 'Optimizador OPTW con grafo de aceras, censo DENUE 2026, pasaporte cultural y matrices precargadas.'
                  : 'Client-side OPTW solver with sidewalk graph, DENUE 2026 census, cultural passport, and precomputed matrices.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-slate-800 text-amber-300 px-2.5 py-1 rounded font-medium border border-slate-700">
              {language === 'es' ? 'Polígono:' : 'Area:'} Centro, Analco, Luz, Alto, Xanenetla
            </span>
          </div>
        </div>

        {/* VISTA 1: MODO EXPLORADOR (VISITANTE) */}
        {currentMode === 'visitor' && (
          <div className="space-y-6">
            {/* Rejilla de Trabajo: Formulario a la izquierda, Mapa a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-6">
                <RouteForm
                  request={request}
                  onChangeRequest={handleUpdateReq}
                  onGenerate={handleGenerate}
                  pois={pois}
                  language={language}
                />
              </div>

              <div className="lg:col-span-7 space-y-6">
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

                {/* Cuadro de Explicación y Descarga de Ruta */}
                {solution && (
                  <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-700 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-amber-600" />
                        {language === 'es' ? 'Explicación del Itinerario Calculado' : 'Route Rationale & Verification'}
                      </div>
                      <button
                        type="button"
                        onClick={handleExportRoute}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        {language === 'es' ? 'Descargar Itinerario Accesible' : 'Export Route'}
                      </button>
                    </div>

                    <p>
                      {language === 'es' ? solution.explanation.es : solution.explanation.en}
                    </p>

                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap gap-4">
                      <span>
                        <strong>{language === 'es' ? 'Verificación en campo:' : 'Field audited:'}</strong>{' '}
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

            {/* Comparador lado a lado */}
            {solution && activeRoute && (
              <RouteComparison
                mainRoute={solution.main_route}
                alternativeRoutes={solution.alternative_routes}
                activeRouteName={activeRoute.name}
                onSelectRoute={(r) => setActiveRoute(r)}
                language={language}
              />
            )}

            {/* Detalle de paradas con Secretos Pokémon GO, Memoria Histórica y S_i */}
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

      {/* Pie de pagina neutral */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <div>
            Ruta Abierta Puebla | Centro Histórico y Barrios Tradicionales
          </div>
          <div>
            Datos oficiales: INEGI DENUE 2026, OpenStreetMap (ODbL), Auditorías de Campo CC BY 4.0
          </div>
        </div>
      </footer>

      {/* Modal de Transparencia, Embudo DENUE y Normas */}
      <DataInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        language={language}
      />
    </div>
  );
}
