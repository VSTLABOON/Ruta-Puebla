import { useState, type FC } from 'react';
import { RouteStop, POI, Language, PassportState } from '@ruta-abierta/shared-types';
import {
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
  MessageSquare,
  Navigation,
  Ticket,
  Flame
} from 'lucide-react';
import { HolographicBadge } from './HolographicBadge';
import { tacticalAudio } from '../utils/tacticalAudio';
import { TalaveraFrieze } from './TalaveraOrnament';

interface TacticalDesktopPanelProps {
  stops: RouteStop[];
  pois: POI[];
  selectedStopPoiId: string | null;
  onSelectStop: (poiId: string) => void;
  language: Language;
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
  onMoveUserHere?: (coords: [number, number]) => void;
}

export const TacticalDesktopPanel: FC<TacticalDesktopPanelProps> = ({
  stops,
  pois,
  selectedStopPoiId,
  onSelectStop,
  language,
  passportState,
  onUnlockSecret,
  onMoveUserHere
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'accessibility' | 'badge' | 'memories'>('info');

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
  const isSecretUnlocked = passportState.unlocked_secrets.includes(poi.id);

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

  return (
    <div className="talavera-plate-card h-full flex flex-col rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
      {/* Cabecera del Lugar en Cobalto Poblano */}
      <div className="p-3.5 border-b border-[#0F3078]/20 flex items-center justify-between gap-3 bg-[#0F3078] text-[#FAF6EE] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shadow-md flex-shrink-0 border border-white/20 ${
              standalonePoi
                ? 'bg-[#1D6B52] text-white'
                : 'bg-[#B84A2C] text-white'
            }`}
          >
            {standalonePoi ? <MapPin className="w-4 h-4" /> : currentStop?.stop_order || 1}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-sm text-[#FAF6EE] truncate tracking-tight font-serif">
                {poi.name}
              </h3>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-white/20 text-[#FAF6EE] border border-white/30 font-semibold">
                {poi.zone.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#FAF6EE]/80 mt-0.5">
              <span className="flex items-center gap-1 text-[#F0B43A] font-medium">
                <Clock className="w-3 h-3" />
                {standalonePoi || !currentStop
                  ? `${poi.hours.open} - ${poi.hours.close}`
                  : `${formatTime(currentStop.arrival_time_min)} - ${formatTime(
                      currentStop.departure_time_min
                    )}`}
              </span>
              <span className="truncate">{poi.address}</span>
            </div>
          </div>
        </div>

        {/* Controles de parada */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-xl bg-[#0A1E4A] border border-[#0F3078] text-[#FAF6EE] disabled:opacity-30 hover:bg-[#1B49AC] transition cursor-pointer"
            title={language === 'es' ? 'Parada anterior' : 'Previous stop'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-[#FAF6EE]/90 px-1">
            {stopIndex >= 0 ? `${currentIndex + 1}/${stops.length}` : 'Mapa'}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === stops.length - 1}
            className="p-1.5 rounded-xl bg-[#0A1E4A] border border-[#0F3078] text-[#FAF6EE] disabled:opacity-30 hover:bg-[#1B49AC] transition cursor-pointer"
            title={language === 'es' ? 'Siguiente parada' : 'Next stop'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cenefa Tradicional de Talavera y Petatillo */}
      <TalaveraFrieze compact />

      {/* Carrusel de paradas de la ruta en azulejo marfil */}
      <div className="px-3 py-2 border-b border-[#0F3078]/15 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 bg-[#F2EBDC]/60">
        {stops.map((stop) => {
          const isSelected = stop.poi.id === poi.id;
          return (
            <button
              key={stop.poi.id}
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                onSelectStop(stop.poi.id);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1.5 whitespace-nowrap transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'bg-[#0F3078] text-[#FAF6EE] font-black shadow'
                  : 'bg-white/80 text-[#0F3078] hover:bg-[#DCE6F9]/50 border border-[#0F3078]/20'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                {stop.stop_order}
              </span>
              <span className="truncate max-w-[100px]">{stop.poi.name}</span>
            </button>
          );
        })}
      </div>

      {/* Pestañas de pigmentos tradicionales de Puebla */}
      <div className="px-3 py-2 border-b border-[#0F3078]/15 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 bg-[#FAF6EE]">
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            setActiveTab('info');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
            activeTab === 'info'
              ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm'
              : 'text-[#0F3078] hover:bg-[#DCE6F9]/40 bg-white/70 border border-[#0F3078]/20'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Lugar' : 'Place'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            setActiveTab('accessibility');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
            activeTab === 'accessibility'
              ? 'bg-[#1D6B52] text-[#FAF6EE] shadow-sm'
              : 'text-[#1D6B52] hover:bg-[#1D6B52]/10 bg-white/70 border border-[#1D6B52]/20'
          }`}
        >
          <Accessibility className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Paso Peatonal' : 'Access'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            setActiveTab('badge');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
            activeTab === 'badge'
              ? 'bg-[#B84A2C] text-[#FAF6EE] shadow-sm'
              : 'text-[#B84A2C] hover:bg-[#B84A2C]/10 bg-white/70 border border-[#B84A2C]/20'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Sello' : 'Badge'}</span>
        </button>

        {((poi.community_memories && poi.community_memories.length > 0) ||
          (poi.historical_figures && poi.historical_figures.length > 0)) && (
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('memories');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap cursor-pointer ${
              activeTab === 'memories'
                ? 'bg-[#6D438A] text-white shadow-sm'
                : 'text-[#6D438A] hover:bg-[#6D438A]/10 bg-white/70 border border-[#6D438A]/20'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Historias' : 'Stories'}</span>
          </button>
        )}
      </div>

      {/* Contenido de la pestaña */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#FAF6EE]">
        {activeTab === 'info' && (
          <div className="space-y-3 animate-fade-slide">
            <div className="bg-white/95 rounded-2xl p-3.5 border-2 border-[#0F3078]/20 text-xs sm:text-sm text-[#162035] leading-relaxed shadow-sm">
              {poi.description[language] || poi.description.es}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/90 p-2.5 rounded-xl border border-[#0F3078]/20 shadow-sm">
                <span className="text-[10px] text-[#162035]/70 block font-semibold">
                  {language === 'es' ? 'Horario' : 'Hours'}
                </span>
                <span className="font-extrabold text-[#0F3078] mt-0.5 block">
                  {poi.hours.open} - {poi.hours.close}
                </span>
              </div>

              <div className="bg-white/90 p-2.5 rounded-xl border border-[#0F3078]/20 shadow-sm">
                <span className="text-[10px] text-[#162035]/70 flex items-center gap-1 font-semibold">
                  <Ticket className="w-3 h-3 text-[#B84A2C]" />
                  {language === 'es' ? 'Entrada' : 'Admission'}
                </span>
                <span className="font-extrabold text-[#B84A2C] mt-0.5 block">
                  {poi.cost_mxn === 0
                    ? language === 'es'
                      ? 'Entrada libre'
                      : 'Free entry'
                    : `$${poi.cost_mxn} MXN`}
                </span>
              </div>

              <div className="bg-white/90 p-2.5 rounded-xl border border-[#0F3078]/20 shadow-sm">
                <span className="text-[10px] text-[#162035]/70 block font-semibold">
                  {language === 'es' ? 'Tiempo sugerido' : 'Suggested stay'}
                </span>
                <span className="font-extrabold text-[#0F3078] mt-0.5 block">
                  {poi.visit_duration_min} min
                </span>
              </div>
            </div>

            {poi.artisan_profile && (
              <div className="bg-[#B84A2C]/10 rounded-2xl p-3.5 border-2 border-[#B84A2C]/30 space-y-2 text-[#162035] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B84A2C] flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Taller de Barrio' : 'Local Workshop'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B84A2C]/20 text-[#B84A2C] font-black border border-[#B84A2C]/30">
                    {poi.artisan_profile.oficio}
                  </span>
                </div>
                <div className="text-xs text-[#162035]">
                  <strong className="text-[#0F3078]">{poi.artisan_profile.maestro_artesano}</strong> •{' '}
                  {poi.artisan_profile.fundacion_anio}
                </div>
                <div className="text-xs text-[#B84A2C] font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 flex-shrink-0 text-[#B84A2C]" />
                  <span>{poi.artisan_profile.demostracion_en_vivo}</span>
                </div>
              </div>
            )}

            {onMoveUserHere && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  onMoveUserHere(poi.coordinates);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-md"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {language === 'es'
                    ? 'Marcar que estoy aquí en el mapa'
                    : 'Set my location here'}
                </span>
              </button>
            )}
          </div>
        )}

        {activeTab === 'accessibility' && (
          <div className="space-y-3 animate-fade-slide">
            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="bg-white/95 p-3.5 rounded-2xl border-2 border-[#1D6B52]/30 space-y-1 shadow-sm">
                <span className="text-[11px] text-[#162035]/70 font-semibold">
                  {language === 'es' ? 'Acceso en la entrada' : 'Entrance access'}
                </span>
                <div className="font-bold text-sm">
                  {poi.entrance_accessible ? (
                    <span className="text-[#1D6B52] flex items-center gap-1.5 font-black">
                      <ShieldCheck className="w-4 h-4" />
                      {language === 'es'
                        ? 'Entrada plana sin escalones'
                        : 'Flat step-free entrance'}
                    </span>
                  ) : (
                    <span className="text-[#B84A2C] flex items-center gap-1.5 font-black">
                      <AlertTriangle className="w-4 h-4" />
                      {language === 'es' ? 'Cuenta con escalón' : 'Has step'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white/95 p-3.5 rounded-2xl border-2 border-[#1D6B52]/30 space-y-1 shadow-sm">
                <span className="text-[11px] text-[#162035]/70 font-semibold">
                  {language === 'es' ? 'Sanitario' : 'Restroom'}
                </span>
                <div className="font-bold text-sm">
                  {poi.restroom_accessible ? (
                    <span className="text-[#1D6B52] flex items-center gap-1.5 font-black">
                      <ShieldCheck className="w-4 h-4" />
                      {language === 'es' ? 'Baño accesible disponible' : 'Accessible restroom'}
                    </span>
                  ) : (
                    <span className="text-[#162035]/60 font-semibold">
                      {language === 'es' ? 'Sin sanitario adaptado' : 'No adapted restroom'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/90 p-3.5 rounded-2xl border-2 border-[#1D6B52]/20 text-xs text-[#162035] space-y-1 shadow-sm">
              <span className="font-bold text-[#1D6B52] block">
                {language === 'es' ? 'Condiciones para caminar:' : 'Walking conditions:'}
              </span>
              <p className="leading-relaxed text-[#162035]/80">
                {currentStop
                  ? currentStop.accessibility_notes[language] || currentStop.accessibility_notes.es
                  : poi.entrance_accessible
                  ? language === 'es'
                    ? 'Acceso cómodo a nivel de banqueta. Ideal para recorrer a pie o con silla de ruedas.'
                    : 'Comfortable street-level access.'
                  : language === 'es'
                  ? 'Inmueble histórico con escalón en la entrada.'
                  : 'Historic building with entrance step.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'badge' && (
          <div className="space-y-3 animate-fade-slide">
            {poi.secret_to_unlock?.pista && !isSecretUnlocked && (
              <div className="bg-[#B84A2C]/10 border-2 border-[#B84A2C]/30 rounded-2xl p-3 text-xs text-[#B84A2C]">
                <strong className="block text-[#B84A2C] mb-0.5 font-black">
                  {language === 'es' ? 'Pista para descubrir el secreto:' : 'Clue:'}
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

        {activeTab === 'memories' && (
          <div className="space-y-3 text-xs animate-fade-slide">
            {poi.historical_figures && poi.historical_figures.length > 0 && (
              <div className="space-y-2">
                <span className="font-black text-[#6D438A] uppercase text-[11px] tracking-wider block font-serif">
                  {language === 'es' ? 'Personajes Históricos' : 'Historical Figures'}
                </span>
                {poi.historical_figures.map((hf, idx) => (
                  <div
                    key={idx}
                    className="bg-white/95 p-3 rounded-2xl border-2 border-[#6D438A]/25 space-y-1 shadow-sm text-[#162035]"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-[#0F3078] text-sm font-serif">{hf.nombre}</strong>
                      <span className="text-[11px] text-[#162035]/60 font-mono">{hf.epoca}</span>
                    </div>
                    <div className="text-[11px] text-[#B84A2C] font-bold">{hf.rol}</div>
                    <p className="text-xs text-[#162035]/80 leading-relaxed">{hf.relato}</p>
                  </div>
                ))}
              </div>
            )}

            {poi.community_memories && poi.community_memories.length > 0 && (
              <div className="space-y-2">
                <span className="font-black text-[#0F3078] uppercase text-[11px] tracking-wider block font-serif">
                  {language === 'es' ? 'Voces de Visitantes' : 'Visitor Stories'}
                </span>
                {poi.community_memories.map((cm, idx) => (
                  <div
                    key={idx}
                    className="bg-white/95 p-3 rounded-2xl border-2 border-[#0F3078]/20 space-y-1 shadow-sm text-[#162035]"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-[#0F3078]">{cm.autor}</strong>
                      <span className="text-[11px] text-[#162035]/60">{cm.procedencia}</span>
                    </div>
                    <p className="text-xs text-[#162035]/80 italic leading-relaxed">
                      &quot;{cm.testimonio}&quot;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
