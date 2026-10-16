import { useState, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import {
  POI,
  SidewalkGraph,
  TimeMatrices,
  RouteRequest,
  RouteAlternative,
  PassportState,
  solveOPTW
} from '@ruta-abierta/shared-types';
import { MapViewer } from '../../components/MapViewer';
import { RouteForm } from '../../components/RouteForm';
import { MobileBottomNav, CommandTab } from '../../components/MobileBottomNav';
import { TacticalBottomSheet } from '../../components/TacticalBottomSheet';
import { TacticalDesktopPanel } from '../../components/TacticalDesktopPanel';
import { PassportGallery } from '../../components/PassportGallery';
import { ArtisanDirectory } from '../../components/ArtisanDirectory';
import {
  Download,
  SlidersHorizontal,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { tacticalAudio } from '../../utils/tacticalAudio';

interface VisitorViewProps {
  pois: POI[];
  graph: SidewalkGraph | null;
  matrices: TimeMatrices | null;
  weights: any;
  language: 'es' | 'en';
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
  userLocation: [number, number];
  onUserLocationChange: (coords: [number, number]) => void;
  onOpenAuth: () => void;
  onOpenDataInfo: () => void;
  onToggleLanguage: () => void;
  onToggleViewport?: () => void;
  viewportMode?: 'mobile' | 'full';
}

export const VisitorView: FC<VisitorViewProps> = ({
  pois,
  graph,
  matrices,
  weights,
  language,
  passportState,
  onUnlockSecret,
  userLocation,
  onUserLocationChange,
  onOpenAuth,
  onOpenDataInfo,
  onToggleLanguage,
  onToggleViewport,
  viewportMode = 'full'
}) => {
  const [commandTab, setCommandTab] = useState<CommandTab>('explore');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const [selectedStopPoiId, setSelectedStopPoiId] = useState<string | null>(null);

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

  const optWeights = useMemo(() => {
    return weights
      ? {
          w_interes: weights.pesos_puntaje_parada_S_i.w_interes.valor_defecto,
          w_presupuesto: weights.pesos_puntaje_parada_S_i.w_presupuesto.valor_defecto,
          w_dispersion: weights.pesos_puntaje_parada_S_i.w_dispersion.valor_defecto,
          w_local: weights.pesos_puntaje_parada_S_i.w_local.valor_defecto
        }
      : undefined;
  }, [weights]);

  const activeRoute: RouteAlternative | null = useMemo(() => {
    if (!graph || !matrices || pois.length === 0) return null;
    const sol = solveOPTW(request, pois, matrices, graph, { weights: optWeights });
    return sol.main_route;
  }, [request, pois, matrices, graph, optWeights]);

  const handleUpdateReq = (updated: Partial<RouteRequest>) => {
    setRequest((prev) => ({ ...prev, ...updated }));
  };

  const handleGenerate = useCallback(() => {
    setSelectedStopPoiId(null);
    setIsFilterDrawerOpen(false);
    setCommandTab('explore');
  }, []);

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

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Controles flotantes en pantalla grande (En móvil se eliminan por completo para dejar el mapa limpio) */}
      <div className="hidden sm:flex absolute top-3 left-4 right-4 z-20 items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {activeRoute && (
            <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-200 shadow-lg flex items-center gap-2">
              <span className="font-bold text-amber-400">
                {activeRoute.stops.length} {language === 'es' ? 'paradas' : 'stops'}
              </span>
              <span className="text-slate-400">• {activeRoute.metrics.total_time_min}m</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-white/10 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all duration-300 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Filtros' : 'Tune'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportRoute}
            className="p-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all duration-300 cursor-pointer"
            title={language === 'es' ? 'Descargar guía' : 'Save route'}
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'es' ? 'Guardar' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Mapa 3D Vectorial Pantalla Completa Permanente */}
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
            onUserLocationChange={onUserLocationChange}
          />
        </div>
      )}

      {/* Panel Lateral Flotante para Escritorio con transición suave */}
      {activeRoute && (
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
              onUnlockSecret={onUnlockSecret}
              onMoveUserHere={(coords) => onUserLocationChange(coords)}
            />
          </div>

          {commandTab === 'explore' && (
            <button
              type="button"
              onClick={() => setIsDesktopPanelOpen((v) => !v)}
              className="hidden lg:flex fixed bottom-6 left-4 z-30 px-3 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-white/15 shadow-2xl items-center gap-2 text-xs font-bold transition-all duration-300 cursor-pointer"
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
            onUnlockSecret={onUnlockSecret}
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
        <div className="lg:hidden">
          <TacticalBottomSheet
            stops={activeRoute.stops}
            pois={pois}
            selectedStopPoiId={selectedStopPoiId}
            onSelectStop={(id) => setSelectedStopPoiId(id)}
            isOpen={isBottomSheetOpen}
            onClose={() => setIsBottomSheetOpen(false)}
            language={language}
            passportState={passportState}
            onUnlockSecret={onUnlockSecret}
            onMoveUserHere={(coords) => onUserLocationChange(coords)}
          />
        </div>
      )}

      {/* Barra Inferior de Navegación Táctica con Menú ClickUp integrado */}
      <MobileBottomNav
        activeTab={commandTab}
        onSelectTab={handleSelectTab}
        onUrbanPulse={handleTriggerUrbanPulse}
        isPulseActive={isPulseActive}
        unlockedCount={passportState.unlocked_secrets.length}
        language={language}
        onOpenTuneRoute={() => setIsFilterDrawerOpen(true)}
        onOpenArtisansDirectory={() => setCommandTab('artisans')}
        onExportRoute={handleExportRoute}
        onOpenAuth={onOpenAuth}
        onOpenDataInfo={onOpenDataInfo}
        onToggleLanguage={onToggleLanguage}
        onToggleViewport={onToggleViewport}
        viewportMode={viewportMode}
      />

      {/* Drawer Deslizable de Filtros de Ruta */}
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
    </div>
  );
};
export default VisitorView;
