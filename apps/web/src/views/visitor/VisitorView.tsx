import { useState, useCallback, useMemo, useRef } from 'react';
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
import { RouteExperienceWizard } from '../../components/RouteExperienceWizard';
import { MobileBottomNav, CommandTab } from '../../components/MobileBottomNav';
import { TacticalBottomSheet } from '../../components/TacticalBottomSheet';
import { TacticalDesktopPanel } from '../../components/TacticalDesktopPanel';
import { PassportGallery } from '../../components/PassportGallery';
import { ArtisanDirectory } from '../../components/ArtisanDirectory';
import {
  SlidersHorizontal,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { tacticalAudio } from '../../utils/tacticalAudio';
import { UserProfile } from '../../types/userRecord';

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
  currentUser?: UserProfile | null;
  onOpenAuth: () => void;
  onOpenRecord?: () => void;
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
  currentUser,
  onOpenAuth,
  onOpenRecord,
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

  const [activeRoute, setActiveRoute] = useState<RouteAlternative | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const pulseCycleRef = useRef(0);

  const handleUpdateReq = (updated: Partial<RouteRequest>) => {
    setRequest((prev) => ({ ...prev, ...updated }));
  };

  const handleGenerate = useCallback(() => {
    if (!graph || !matrices || pois.length === 0) return;
    const sol = solveOPTW(request, pois, matrices, graph, { weights: optWeights });
    setActiveRoute(sol.main_route);
    setSelectedStopPoiId(null);
    setIsFilterDrawerOpen(false);
    setCommandTab('explore');
  }, [graph, matrices, pois, request, optWeights]);

  const handleClearRoute = useCallback(() => {
    setActiveRoute(null);
    setSelectedStopPoiId(null);
  }, []);

  const handleTriggerUrbanPulse = () => {
    setIsPulseActive(true);
    tacticalAudio.playUrbanPulse();

    if (pois.length > 0) {
      const sortedByDistance = [...pois]
        .map((poi) => {
          const dx = poi.coordinates[0] - userLocation[0];
          const dy = poi.coordinates[1] - userLocation[1];
          return { poi, distSq: dx * dx + dy * dy };
        })
        .sort((a, b) => a.distSq - b.distSq);

      const topCount = Math.min(3, sortedByDistance.length);
      const target = sortedByDistance[pulseCycleRef.current % topCount]?.poi;
      pulseCycleRef.current = (pulseCycleRef.current + 1) % topCount;

      if (target) {
        setCommandTab('explore');
        setSelectedStopPoiId(target.id);
        setIsBottomSheetOpen(true);
        setIsDesktopPanelOpen(true);
      }
    }

    setTimeout(() => {
      setIsPulseActive(false);
    }, 2200);
  };

  const handleInspectStop = (poiId: string) => {
    setSelectedStopPoiId(poiId);
    setIsBottomSheetOpen(true);
    setIsDesktopPanelOpen(true);
  };

  const handleSelectTab = (tab: CommandTab) => {
    if (tab === 'itinerary') {
      if (!activeRoute) {
        setIsWizardOpen(true);
      } else {
        setIsBottomSheetOpen((prev) => !prev);
        setIsDesktopPanelOpen(true);
      }
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
      `POPOGO PUEBLA - GUÍA DE RECORRIDO PEATONAL ACCESIBLE`,
      `Duración estimada: ${activeRoute.metrics.total_time_min} min | Distancia: ${activeRoute.metrics.distance_meters} m`,
      `Presupuesto estimado: $${activeRoute.metrics.total_cost_mxn} MXN`,
      ``,
      `LUGARES DE TU RECORRIDO POPOGO:`,
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
    link.download = `popogo_recorrido_${request.profile}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasSidePanelVisible =
    Boolean(activeRoute || selectedStopPoiId) && isDesktopPanelOpen && commandTab === 'explore';

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Mapa 3D Vectorial Pantalla Completa Permanente */}
      {graph && (
        <div className="absolute inset-0 w-full h-full">
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
            onClearRoute={handleClearRoute}
            onOpenFilters={() => setIsFilterDrawerOpen(true)}
            onExportRoute={activeRoute ? handleExportRoute : undefined}
            isDesktopPanelOpen={hasSidePanelVisible}
            isMobileSheetOpen={isBottomSheetOpen && Boolean(activeRoute || selectedStopPoiId)}
          />
        </div>
      )}

      {/* Panel Lateral Flotante para Escritorio con transición suave */}
      {(activeRoute || selectedStopPoiId) && (
        <>
          <div
            className={`hidden lg:block absolute top-3 left-4 bottom-24 w-[380px] z-20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isDesktopPanelOpen && commandTab === 'explore'
                ? 'translate-x-0 opacity-100 pointer-events-auto'
                : '-translate-x-[410px] opacity-0 pointer-events-none'
            }`}
          >
            <TacticalDesktopPanel
              stops={activeRoute?.stops || []}
              pois={pois}
              selectedStopPoiId={selectedStopPoiId}
              onSelectStop={(id) => setSelectedStopPoiId(id)}
              language={language}
              passportState={passportState}
              onUnlockSecret={onUnlockSecret}
              onMoveUserHere={(coords) => onUserLocationChange(coords)}
              onOpenItinerary={() => setIsWizardOpen(true)}
            />
          </div>

          {commandTab === 'explore' && (
            <button
              type="button"
              onClick={() => setIsDesktopPanelOpen((v) => !v)}
              className="hidden lg:flex fixed bottom-6 left-4 z-30 px-3.5 py-2 rounded-2xl bg-[#FAF6EE] hover:bg-[#FFFDF9] text-[#0F3078] border-2 border-[#0F3078] shadow-xl items-center gap-2 text-xs font-black transition-all duration-300 cursor-pointer"
            >
              {isDesktopPanelOpen ? (
                <>
                  <PanelLeftClose className="w-4 h-4 text-[#B84A2C]" />
                  <span>{language === 'es' ? 'Ocultar ficha' : 'Hide panel'}</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#B84A2C]" />
                  <span>{language === 'es' ? 'Ver ficha del lugar' : 'Show place card'}</span>
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Overlay Suave: Pasaporte de Sellos con Fondo Cerámico Talavera */}
      <div
        className={`absolute inset-0 z-30 talavera-bg-pattern backdrop-blur-xl overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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

      {/* Overlay Suave: Directorio de Talleres Artesanales con Fondo Cerámico Talavera */}
      <div
        className={`absolute inset-0 z-30 talavera-bg-pattern backdrop-blur-xl overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
      {(activeRoute || selectedStopPoiId) && (
        <div className="lg:hidden">
          <TacticalBottomSheet
            stops={activeRoute?.stops || []}
            pois={pois}
            selectedStopPoiId={selectedStopPoiId}
            onSelectStop={(id) => setSelectedStopPoiId(id)}
            isOpen={isBottomSheetOpen}
            onClose={() => setIsBottomSheetOpen(false)}
            language={language}
            passportState={passportState}
            onUnlockSecret={onUnlockSecret}
            onMoveUserHere={(coords) => onUserLocationChange(coords)}
            onOpenItinerary={() => setIsWizardOpen(true)}
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
        currentUser={currentUser}
        onOpenTuneRoute={() => setIsWizardOpen(true)}
        onOpenArtisansDirectory={() => setCommandTab('artisans')}
        onExportRoute={handleExportRoute}
        onOpenAuth={onOpenAuth}
        onOpenRecord={onOpenRecord}
        onOpenDataInfo={onOpenDataInfo}
        onToggleLanguage={onToggleLanguage}
        onToggleViewport={onToggleViewport}
        viewportMode={viewportMode}
      />

      {/* Asistente Intuitivo de Experiencia Peatonal */}
      <RouteExperienceWizard
        pois={pois}
        graph={graph}
        matrices={matrices}
        language={language}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSelectRoute={(route) => {
          setActiveRoute(route);
          setSelectedStopPoiId(route.stops[0]?.poi.id || null);
          setIsBottomSheetOpen(true);
          setIsDesktopPanelOpen(true);
          setIsWizardOpen(false);
        }}
      />

      {/* Drawer Deslizable de Filtros de Ruta */}
      <div
        className={`fixed inset-0 z-50 bg-[#0A1E4A]/65 backdrop-blur-sm flex justify-end transition-opacity duration-300 ${
          isFilterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsFilterDrawerOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md bg-[#FAF6EE] border-l-4 border-[#0F3078] text-[#162035] h-full flex flex-col shadow-2xl transition-transform duration-300 ${
            isFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <header className="px-5 py-3.5 bg-[#0F3078] text-[#FAF6EE] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#F0B43A]" />
              <h3 className="font-serif font-black text-sm text-[#FAF6EE]">
                {language === 'es' ? 'Ajustar Filtros de Ruta' : 'Adjust Route Filters'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(false)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
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
    </div>
  );
};
export default VisitorView;
