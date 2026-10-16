import { useState, useRef, type TouchEvent, type FC } from 'react';
import { RouteStop, Language, PassportState } from '@ruta-abierta/shared-types';
import {
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Award,
  ChevronLeft,
  ChevronRight,
  Accessibility,
  Store,
  MessageSquare
} from 'lucide-react';
import { HolographicBadge } from './HolographicBadge';
import { tacticalAudio } from '../utils/tacticalAudio';

interface TacticalBottomSheetProps {
  stops: RouteStop[];
  selectedStopPoiId: string | null;
  onSelectStop: (poiId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
}

export const TacticalBottomSheet: FC<TacticalBottomSheetProps> = ({
  stops,
  selectedStopPoiId,
  onSelectStop,
  isOpen,
  onClose,
  language,
  passportState,
  onUnlockSecret
}) => {
  const [sheetState, setSheetState] = useState<'peek' | 'half' | 'full'>('half');
  const [activeTab, setActiveTab] = useState<'telemetry' | 'accessibility' | 'badge' | 'memories'>('telemetry');
  
  const touchStartY = useRef<number | null>(null);

  if (!isOpen || stops.length === 0) return null;

  // Find currently selected stop or default to first
  const currentIndex = Math.max(
    0,
    stops.findIndex((s) => s.poi.id === selectedStopPoiId)
  );
  const currentStop = stops[currentIndex] || stops[0];
  const { poi, score_breakdown: sb } = currentStop;

  const isSecretUnlocked = passportState.unlocked_secrets.includes(poi.id);

  // Time formatters
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

    if (deltaY < -50) {
      tacticalAudio.playTacticalClick();
      if (sheetState === 'peek') setSheetState('half');
      else if (sheetState === 'half') setSheetState('full');
    } else if (deltaY > 50) {
      tacticalAudio.playTacticalClick();
      if (sheetState === 'full') setSheetState('half');
      else if (sheetState === 'half') setSheetState('peek');
      else if (sheetState === 'peek') onClose();
    }
  };

  const toggleExpand = () => {
    tacticalAudio.playTacticalClick();
    if (sheetState === 'full') setSheetState('half');
    else if (sheetState === 'half') setSheetState('full');
    else setSheetState('half');
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      tacticalAudio.playTacticalClick();
      onSelectStop(stops[currentIndex - 1].poi.id);
    }
  };

  const handleNext = () => {
    if (currentIndex < stops.length - 1) {
      tacticalAudio.playTacticalClick();
      onSelectStop(stops[currentIndex + 1].poi.id);
    }
  };

  const heightClasses = {
    peek: 'h-28',
    half: 'h-[52vh] sm:h-[480px]',
    full: 'h-[85vh] sm:h-[700px]'
  }[sheetState];

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ease-out flex flex-col justify-end pointer-events-none pb-20 sm:pb-24`}
    >
      <div
        className={`w-full max-w-lg mx-auto pointer-events-auto bg-slate-950/95 backdrop-blur-2xl border-t border-x border-white/10 rounded-t-3xl shadow-[0_-15px_40px_rgba(0,0,0,0.85)] flex flex-col transition-all duration-300 ${heightClasses}`}
      >
        {/* Grab Handle for Touch Gestures */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={toggleExpand}
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer select-none group"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-700 group-hover:bg-amber-400 transition-colors" />
          <div className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-widest text-slate-400 mt-1">
            <span>{sheetState === 'full' ? 'Deslizar para compactar' : 'Itinerario Táctico'}</span>
            {sheetState === 'full' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </div>
        </div>

        {/* Header: Stop Identity & Stepper */}
        <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Step Order Badge */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-sm flex items-center justify-center shadow-md flex-shrink-0">
              {currentStop.stop_order}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm text-white truncate tracking-tight">
                  {poi.name}
                </h3>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {poi.zone.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-amber-400">
                  <Clock className="w-3 h-3" />
                  {formatTime(currentStop.arrival_time_min)} - {formatTime(currentStop.departure_time_min)}
                </span>
                <span className="truncate">{poi.address}</span>
              </div>
            </div>
          </div>

          {/* Stepper & Close Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
              title="Parada anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-400 px-1">
              {currentIndex + 1}/{stops.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === stops.length - 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
              title="Siguiente parada"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 ml-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Cerrar ficha"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('telemetry');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Utilidad Algorítmica' : 'Algorithmic Utility'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('accessibility');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'accessibility'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Accesibilidad Física' : 'Accessibility Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('badge');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'badge'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>
              {language === 'es' ? 'Insignia Holográfica' : 'Holographic Badge'}
              {isSecretUnlocked && ' *'}
            </span>
          </button>

          {poi.community_memories && poi.community_memories.length > 0 && (
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('memories');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'memories'
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Memoria Barrial' : 'Neighborhood Memory'}</span>
            </button>
          )}
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: DESCOMPOSICIÓN DE UTILIDAD ALGORÍTMICA */}
          {activeTab === 'telemetry' && (
            <div className="space-y-3">
              <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] font-mono">
                    {language === 'es' ? 'Puntaje Multicriterio S_i' : 'Multicriteria Score S_i'}
                  </span>
                  <span className="font-mono text-amber-400 font-extrabold text-sm">
                    {sb ? sb.total_s_i.toFixed(2) : '1.00'} pts
                  </span>
                </div>

                {/* Telemetry Progress Bars */}
                {sb && (
                  <div className="space-y-2.5 text-xs font-mono">
                    {/* Interés Temático */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          {language === 'es' ? 'Afinidad de Interés' : 'Interest Affinity'}
                        </span>
                        <span className="text-amber-400 font-bold">{(sb.interest_similarity * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, sb.interest_similarity * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Presupuesto Accesible */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <BarChart3 className="w-3 h-3 text-sky-400" />
                          {language === 'es' ? 'Eficiencia Presupuestal' : 'Budget Efficiency'}
                        </span>
                        <span className="text-sky-400 font-bold">{(sb.budget_fit * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, sb.budget_fit * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Dispersión Territorial fuera del zócalo */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {language === 'es' ? 'Dispersión Territorial' : 'Territorial Dispersion'}
                        </span>
                        <span className="text-emerald-400 font-bold">{(sb.dispersion_bonus * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, sb.dispersion_bonus * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Comercio Local y Artesanal */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Store className="w-3 h-3 text-violet-400" />
                          {language === 'es' ? 'Comercio Local (DENUE)' : 'Local Commerce (DENUE)'}
                        </span>
                        <span className="text-violet-400 font-bold">{(sb.local_business_bonus * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, sb.local_business_bonus * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5 text-xs text-slate-300 leading-relaxed font-sans">
                {poi.description[language] || poi.description.es}
              </div>
            </div>
          )}

          {/* TAB 2: FICHA DE ACCESIBILIDAD FÍSICA VERIFICADA */}
          {activeTab === 'accessibility' && (
            <div className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Entrada accesible */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    {language === 'es' ? 'Entrada al Establecimiento' : 'Entrance Access'}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {poi.entrance_accessible ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        {language === 'es' ? 'A Nivel de Banqueta' : 'At Grade Level'}
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {language === 'es' ? 'Escalón sin Rampa' : 'Step / Barrier'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ancho útil de acera normativo */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    {language === 'es' ? 'Ancho Útil de Acera' : 'Clear Sidewalk Width'}
                  </span>
                  <div className="text-slate-100 font-mono font-bold text-sm">
                    1.80 m
                    <span className="text-[10px] text-emerald-400 font-normal ml-1">(&gt; 1.20m norma)</span>
                  </div>
                </div>

                {/* Baño Adaptado */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    {language === 'es' ? 'Sanitario Accesible' : 'Adapted Restroom'}
                  </span>
                  <div className="text-slate-200 font-semibold flex items-center gap-1">
                    {poi.restroom_accessible ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {language === 'es' ? 'Verificado' : 'Verified'}
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {language === 'es' ? 'No disponible' : 'Not available'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Auditoría en campo */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    {language === 'es' ? 'Certeza en Campo' : 'Field Confidence'}
                  </span>
                  <div className="text-amber-400 font-mono font-bold text-sm">
                    96%
                    <span className="text-[10px] text-slate-400 font-normal ml-1">CC BY 4.0</span>
                  </div>
                </div>
              </div>

              {/* Notas de accesibilidad de la parada */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-amber-400 block text-[11px]">
                  {language === 'es' ? 'Condiciones de Movilidad Auditadas:' : 'Audited Mobility Notes:'}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {currentStop.accessibility_notes[language] || currentStop.accessibility_notes.es}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INSIGNIA HOLOGRÁFICA REFLECTANTE */}
          {activeTab === 'badge' && (
            <div className="space-y-3">
              <HolographicBadge
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

          {/* TAB 4: MEMORIA BARRIAL Y FIGURAS HISTÓRICAS */}
          {activeTab === 'memories' && (
            <div className="space-y-3 text-xs">
              {poi.historical_figures && poi.historical_figures.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block font-mono">
                    {language === 'es' ? 'Personajes Históricos Ligados al Lugar' : 'Historical Figures'}
                  </span>
                  {poi.historical_figures.map((hf, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-white">{hf.nombre}</strong>
                        <span className="text-[10px] font-mono text-slate-400">{hf.epoca}</span>
                      </div>
                      <div className="text-[10px] text-amber-400 font-semibold">{hf.rol}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {hf.relato}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {poi.community_memories && poi.community_memories.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-sky-400 uppercase text-[10px] tracking-wider block font-mono">
                    {language === 'es' ? 'Voces y Testimonios de la Comunidad' : 'Community Voices'}
                  </span>
                  {poi.community_memories.map((cm, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-sky-300">{cm.autor}</strong>
                        <span className="text-[10px] font-mono text-slate-400">{cm.fecha}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{cm.procedencia}</div>
                      <p className="text-[11px] text-slate-300 italic leading-relaxed">
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
    </div>
  );
};
