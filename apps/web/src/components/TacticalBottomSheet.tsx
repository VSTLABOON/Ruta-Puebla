import { useState, useRef, type TouchEvent, type FC } from 'react';
import { RouteStop, POI, Language, PassportState } from '@ruta-abierta/shared-types';
import {
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
  Accessibility,
  Store,
  Navigation,
  Ticket,
  Flame,
  Footprints,
  Landmark,
  Utensils,
  Compass,
  ArrowRight,
  Route
} from 'lucide-react';
import { HolographicBadge } from './HolographicBadge';
import { tacticalAudio } from '../utils/tacticalAudio';
import { PoiCulturalContextCard } from './PoiCulturalContextCard';

interface TacticalBottomSheetProps {
  stops: RouteStop[];
  pois: POI[];
  selectedStopPoiId: string | null;
  onSelectStop: (poiId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
  onMoveUserHere?: (coords: [number, number]) => void;
  onOpenItinerary?: () => void;
}

function getActivityMeta(poi: POI, language: Language) {
  if (poi.category === 'artesania' || poi.artisan_profile) {
    return {
      Icon: Flame,
      color: 'text-[#D48914]',
      label: language === 'es' ? 'Taller y oficio en vivo' : 'Live craft workshop'
    };
  }
  if (poi.category === 'gastronomia' || poi.category === 'comercio_local') {
    return {
      Icon: Utensils,
      color: 'text-[#B84A2C]',
      label: language === 'es' ? 'Degustación y comida' : 'Tasting & food'
    };
  }
  if (poi.category === 'espacio_publico') {
    return {
      Icon: Compass,
      color: 'text-[#1D6B52]',
      label: language === 'es' ? 'Paseo y descanso' : 'Stroll & rest'
    };
  }
  return {
    Icon: Landmark,
    color: 'text-[#0F3078]',
    label: language === 'es' ? 'Visita cultural' : 'Cultural visit'
  };
}

export const TacticalBottomSheet: FC<TacticalBottomSheetProps> = ({
  stops,
  pois,
  selectedStopPoiId,
  onSelectStop,
  isOpen,
  onClose,
  language,
  passportState,
  onUnlockSecret,
  onMoveUserHere,
  onOpenItinerary
}) => {
  const [sheetState, setSheetState] = useState<'peek' | 'half' | 'full'>('half');
  const [activeTab, setActiveTab] = useState<'info' | 'accessibility' | 'badge'>('info');

  const touchStartY = useRef<number | null>(null);

  if (stops.length === 0 && pois.length === 0) return null;

  const stopIndex = stops.findIndex((s) => s.poi.id === selectedStopPoiId);
  const currentStop = stopIndex >= 0 ? stops[stopIndex] : stops[0] || null;
  const standalonePoi =
    stopIndex < 0 && selectedStopPoiId
      ? pois.find((p) => p.id === selectedStopPoiId) || null
      : null;

  const poi = standalonePoi || currentStop?.poi || pois[0];
  if (!poi) return null;

  const currentIndex = stopIndex >= 0 ? stopIndex : 0;
  const prevStop = !standalonePoi && stops.length > 1 && currentIndex > 0 ? stops[currentIndex - 1] : null;
  const nextStop =
    !standalonePoi && stops.length > 1 && currentIndex < stops.length - 1 ? stops[currentIndex + 1] : null;

  const walkFromPrevMin =
    prevStop && currentStop
      ? Math.max(1, Math.round(currentStop.arrival_time_min - prevStop.departure_time_min))
      : null;
  const walkToNextMin =
    nextStop && currentStop
      ? Math.max(1, Math.round(nextStop.arrival_time_min - currentStop.departure_time_min))
      : null;

  const activityMeta = getActivityMeta(poi, language);
  const ActivityIcon = activityMeta.Icon;

  const isSecretUnlocked = passportState.unlocked_secrets.includes(poi.id);

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    touchStartY.current = null;

    if (deltaY < -45) {
      tacticalAudio.playTacticalClick();
      if (sheetState === 'peek') setSheetState('half');
      else if (sheetState === 'half') setSheetState('full');
    } else if (deltaY > 45) {
      tacticalAudio.playTacticalClick();
      if (sheetState === 'full') setSheetState('half');
      else if (sheetState === 'half') setSheetState('peek');
      else if (sheetState === 'peek') onClose();
    }
  };

  const toggleExpand = () => {
    tacticalAudio.playTacticalClick();
    if (sheetState === 'full') setSheetState('half');
    else setSheetState('full');
  };

  const handlePrev = () => {
    if (stops.length > 0 && currentIndex > 0) {
      tacticalAudio.playTacticalClick();
      onSelectStop(stops[currentIndex - 1].poi.id);
    }
  };

  const handleNext = () => {
    if (stops.length > 0 && currentIndex < stops.length - 1) {
      tacticalAudio.playTacticalClick();
      onSelectStop(stops[currentIndex + 1].poi.id);
    }
  };

  // Alturas contenidas dentro del contenedor de vista para nunca rebasar la barra superior
  const heightClasses = {
    peek: 'h-24 max-h-[calc(100%-5.5rem)]',
    half: 'h-[48vh] max-h-[calc(100%-5.5rem)]',
    full: 'h-[70vh] max-h-[calc(100%-5.5rem)]'
  }[sheetState];

  return (
    <div
      aria-hidden={!isOpen}
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end pb-20 sm:pb-24 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isOpen
          ? 'translate-y-0 opacity-100 pointer-events-none'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-full max-w-lg mx-auto bg-[#FAF6EE] border-t-4 border-x-2 border-[#0F3078] rounded-t-[28px] shadow-[0_-15px_45px_rgba(15,48,120,0.25)] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        } ${heightClasses}`}
      >
        {/* 1. Tirador deslizable y Cabecera compacta */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={toggleExpand}
          className="w-full pt-2 pb-1 flex items-center justify-center cursor-pointer select-none bg-[#0F3078]"
        >
          <div className="w-10 h-1 rounded-full bg-white/40" />
        </div>

        <header className="bg-[#0F3078] text-[#FAF6EE] px-4 pb-3 pt-1 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 font-serif font-black text-xs flex items-center justify-center flex-shrink-0">
              {standalonePoi ? <MapPin className="w-4 h-4 text-[#F0B43A]" /> : currentStop?.stop_order || 1}
            </div>

            <div className="min-w-0">
              <h3 className="font-serif font-black text-sm text-[#FAF6EE] truncate">
                {poi.name}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-[#DCE6F9] truncate">
                <span className="flex items-center gap-1 text-[#F0B43A] font-semibold flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {standalonePoi || !currentStop
                    ? `${poi.hours.open} - ${poi.hours.close}`
                    : `${formatTime(currentStop.arrival_time_min)} - ${formatTime(
                        currentStop.departure_time_min
                      )}`}
                </span>
                <span>•</span>
                <span className="truncate capitalize">{poi.zone.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onOpenItinerary && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  onOpenItinerary();
                }}
                className="px-2 py-1.5 rounded-xl bg-[#B84A2C] hover:bg-[#D66544] text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title={language === 'es' ? 'Elegir o armar ruta' : 'Choose or build route'}
              >
                <Route className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{language === 'es' ? 'Ruta' : 'Route'}</span>
              </button>
            )}

            {stops.length > 0 && stopIndex >= 0 && (
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-1 rounded-lg text-[#FAF6EE] disabled:opacity-30 hover:bg-white/15 transition cursor-pointer"
                  title={language === 'es' ? 'Anterior' : 'Previous'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold px-1.5">
                  {currentIndex + 1}/{stops.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === stops.length - 1}
                  className="p-1 rounded-lg text-[#FAF6EE] disabled:opacity-30 hover:bg-white/15 transition cursor-pointer"
                  title={language === 'es' ? 'Siguiente' : 'Next'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={toggleExpand}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer"
              title={sheetState === 'full' ? 'Reducir' : 'Ampliar'}
            >
              {sheetState === 'full' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer"
              title={language === 'es' ? 'Cerrar' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. Selector Segmentado Unificado (3 pestañas limpias) */}
        <div className="px-3.5 py-2 bg-[#F2EBDC] border-b border-[#0F3078]/15 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-white/80 p-1 rounded-xl border border-[#0F3078]/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('info');
              }}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{language === 'es' ? 'Resumen' : 'Overview'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('accessibility');
              }}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'accessibility'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Accessibility className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{language === 'es' ? 'Acceso' : 'Access'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('badge');
              }}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'badge'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Award className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{language === 'es' ? 'Sello' : 'Stamp'}</span>
            </button>
          </div>
        </div>

        {/* 3. Cuerpo con Scroll Propio */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-[#FAF6EE]">
          {activeTab === 'info' && (
            <div className="space-y-3">
              {/* Conector de trayecto entre paradas de la ruta */}
              {!standalonePoi && (prevStop || nextStop) && (
                <div className="bg-white rounded-2xl p-2.5 border border-[#0F3078]/15 shadow-xs flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  {prevStop && walkFromPrevMin !== null ? (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex items-center gap-1.5 text-[#0F3078] hover:text-[#B84A2C] font-semibold transition cursor-pointer min-w-0"
                    >
                      <Footprints className="w-3.5 h-3.5 text-[#1D6B52] flex-shrink-0" />
                      <span className="truncate">
                        {language === 'es'
                          ? `A ${walkFromPrevMin} min de ${prevStop.poi.name}`
                          : `${walkFromPrevMin} min from ${prevStop.poi.name}`}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#1D6B52] font-bold">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{language === 'es' ? 'Punto de inicio' : 'Starting point'}</span>
                    </span>
                  )}

                  {nextStop && walkToNextMin !== null && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1 text-[#0F3078] hover:text-[#B84A2C] font-bold bg-[#FAF6EE] px-2 py-1 rounded-lg border border-[#0F3078]/15 transition cursor-pointer min-w-0 ml-auto"
                    >
                      <Footprints className="w-3 h-3 text-[#1D6B52] flex-shrink-0" />
                      <span className="truncate max-w-[140px]">
                        {language === 'es'
                          ? `Sigue a ${walkToNextMin} min: ${nextStop.poi.name}`
                          : `Next (${walkToNextMin}m): ${nextStop.poi.name}`}
                      </span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    </button>
                  )}
                </div>
              )}

              <PoiCulturalContextCard poi={poi} language={language} />

              <div className="bg-white rounded-2xl p-3.5 border border-[#0F3078]/15 text-xs text-[#162035] leading-relaxed shadow-xs">
                {poi.description[language] || poi.description.es}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-[#0F3078]/15 shadow-xs">
                  <span className="text-[10px] text-[#0F3078]/70 block font-semibold">
                    {language === 'es' ? 'Horario' : 'Hours'}
                  </span>
                  <span className="font-bold text-[#162035] mt-0.5 block">
                    {poi.hours.open} - {poi.hours.close}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-[#0F3078]/15 shadow-xs">
                  <span className="text-[10px] text-[#0F3078]/70 flex items-center gap-1 font-semibold">
                    <Ticket className="w-3 h-3 text-[#B84A2C]" />
                    {language === 'es' ? 'Entrada' : 'Entry'}
                  </span>
                  <span className="font-bold text-[#B84A2C] mt-0.5 block">
                    {poi.cost_mxn === 0
                      ? language === 'es'
                        ? 'Libre'
                        : 'Free'
                      : `$${poi.cost_mxn} MXN`}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-[#0F3078]/15 shadow-xs">
                  <span className="text-[10px] text-[#0F3078]/70 flex items-center gap-1 font-semibold">
                    <ActivityIcon className={`w-3 h-3 ${activityMeta.color}`} />
                    <span className="truncate">{activityMeta.label}</span>
                  </span>
                  <span className="font-bold text-[#162035] mt-0.5 block">
                    {poi.visit_duration_min} min
                  </span>
                </div>
              </div>

              {poi.artisan_profile && (
                <div className="bg-white rounded-2xl p-3.5 border border-[#B84A2C]/35 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#B84A2C] flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Taller artesanal' : 'Local workshop'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B84A2C]/10 text-[#B84A2C] font-bold">
                      {poi.artisan_profile.oficio}
                    </span>
                  </div>
                  <div className="text-xs text-[#162035]">
                    <strong>{poi.artisan_profile.maestro_artesano}</strong> •{' '}
                    {language === 'es' ? 'Desde' : 'Since'} {poi.artisan_profile.fundacion_anio}
                  </div>
                  <div className="text-xs text-[#B84A2C] font-medium flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{poi.artisan_profile.demostracion_en_vivo}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-white p-3.5 rounded-2xl border border-[#0F3078]/15 space-y-1 shadow-xs">
                  <span className="text-[11px] text-[#0F3078]/70 font-semibold">
                    {language === 'es' ? 'Entrada al lugar' : 'Entrance'}
                  </span>
                  <div className="font-bold text-xs">
                    {poi.entrance_accessible ? (
                      <span className="text-[#1D6B52] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        {language === 'es' ? 'Entrada plana sin escalones' : 'Step-free entrance'}
                      </span>
                    ) : (
                      <span className="text-[#B84A2C] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {language === 'es' ? 'Con escalón en la entrada' : 'Has entrance step'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-[#0F3078]/15 space-y-1 shadow-xs">
                  <span className="text-[11px] text-[#0F3078]/70 font-semibold">
                    {language === 'es' ? 'Sanitario' : 'Restroom'}
                  </span>
                  <div className="font-bold text-xs">
                    {poi.restroom_accessible ? (
                      <span className="text-[#1D6B52] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        {language === 'es' ? 'Sanitario adaptado disponible' : 'Accessible restroom'}
                      </span>
                    ) : (
                      <span className="text-[#162035]/60 flex items-center gap-1.5">
                        {language === 'es' ? 'Sin sanitario adaptado' : 'No adapted restroom'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#0F3078]/15 text-xs text-[#162035] space-y-1 shadow-xs">
                <strong className="text-[#0F3078] block">
                  {language === 'es' ? 'Nota sobre el camino:' : 'Sidewalk note:'}
                </strong>
                <p className="leading-relaxed text-[#162035]/80">
                  {currentStop
                    ? currentStop.accessibility_notes[language] || currentStop.accessibility_notes.es
                    : poi.entrance_accessible
                    ? language === 'es'
                      ? 'Acceso cómodo a nivel de banqueta para recorrer a pie o en silla de ruedas.'
                      : 'Comfortable street-level access suitable for wheelchairs and strollers.'
                    : language === 'es'
                    ? 'Este edificio histórico tiene escalón en su entrada principal.'
                    : 'This historic building has a step at the main entrance.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'badge' && (
            <div className="space-y-3">
              {poi.secret_to_unlock?.pista && !isSecretUnlocked && (
                <div className="bg-white border border-[#D48914]/50 rounded-2xl p-3 text-xs text-[#162035] shadow-xs">
                  <strong className="block text-[#B84A2C] mb-0.5">
                    {language === 'es' ? 'Pista:' : 'Clue:'}
                  </strong>
                  {poi.secret_to_unlock.pista}
                </div>
              )}
              <HolographicBadge
                poiId={poi.id}
                badgeName={poi.secret_to_unlock?.insignia_nombre || `Medallón ${poi.name}`}
                poiName={poi.name}
                zone={poi.zone}
                secretTitle={poi.secret_to_unlock?.titulo}
                secretDescription={poi.secret_to_unlock?.descripcion}
                isUnlocked={isSecretUnlocked}
                onUnlock={() => {
                  const badge = poi.secret_to_unlock?.insignia_nombre || `Medallón ${poi.name}`;
                  onUnlockSecret(poi.id, badge);
                }}
                language={language}
              />
            </div>
          )}
        </div>

        {/* 4. Footer Fijo */}
        {onMoveUserHere && sheetState !== 'peek' && (
          <footer className="px-4 py-2.5 bg-white border-t border-[#0F3078]/15 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                onMoveUserHere(poi.coordinates);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>
                {language === 'es' ? 'Ir a este punto en el mapa' : 'Move to this point on map'}
              </span>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
