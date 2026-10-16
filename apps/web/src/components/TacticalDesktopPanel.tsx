import { useState, type FC } from 'react';
import { RouteStop, Language, PassportState } from '@ruta-abierta/shared-types';
import {
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

interface TacticalDesktopPanelProps {
  stops: RouteStop[];
  selectedStopPoiId: string | null;
  onSelectStop: (poiId: string) => void;
  language: Language;
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
  explanation?: { es: string; en: string };
}

export const TacticalDesktopPanel: FC<TacticalDesktopPanelProps> = ({
  stops,
  selectedStopPoiId,
  onSelectStop,
  language,
  passportState,
  onUnlockSecret,
  explanation
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'accessibility' | 'badge' | 'memories'>('telemetry');

  if (stops.length === 0) return null;

  const currentIndex = Math.max(
    0,
    stops.findIndex((s) => s.poi.id === selectedStopPoiId)
  );
  const currentStop = stops[currentIndex] || stops[0];
  const { poi, score_breakdown: sb } = currentStop;
  const isSecretUnlocked = passportState.unlocked_secrets.includes(poi.id);

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

  return (
    <div className="h-full flex flex-col bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Top Header: Stop Stepper */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/60 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
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

        {/* Stepper Controls */}
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
        </div>
      </div>

      {/* Mini Stops Carousel / Pills */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 bg-slate-950/40">
        {stops.map((stop) => {
          const isSelected = stop.poi.id === currentStop.poi.id;
          return (
            <button
              key={stop.poi.id}
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                onSelectStop(stop.poi.id);
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-slate-950/40 flex items-center justify-center text-[9px] font-bold">
                {stop.stop_order}
              </span>
              <span className="truncate max-w-[90px]">{stop.poi.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Selectors */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
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
          <span>{language === 'es' ? 'Accesibilidad' : 'Accessibility'}</span>
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
          <span>{language === 'es' ? 'Insignia' : 'Badge'}</span>
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
            <span>{language === 'es' ? 'Memoria' : 'Memories'}</span>
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* TAB 1: TELEMETRY & ALGORITHMIC UTILITY */}
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

              {sb && (
                <div className="space-y-2.5 text-xs font-mono">
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

            <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5 text-xs text-slate-300 leading-relaxed font-sans">
              {poi.description[language] || poi.description.es}
            </div>

            {explanation && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 text-[11px] text-slate-400 font-mono space-y-1">
                <span className="text-amber-400 font-bold uppercase block text-[10px]">
                  {language === 'es' ? 'Justificación del Recorrido:' : 'Route Rationale:'}
                </span>
                <p className="leading-relaxed">
                  {language === 'es' ? explanation.es : explanation.en}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACCESSIBILITY */}
        {activeTab === 'accessibility' && (
          <div className="space-y-3 font-sans">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  {language === 'es' ? 'Entrada al Establecimiento' : 'Entrance Access'}
                </span>
                <div className="flex items-center gap-1.5 font-bold">
                  {poi.entrance_accessible ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      {language === 'es' ? 'A Nivel' : 'At Grade'}
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {language === 'es' ? 'Escalón' : 'Step'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  {language === 'es' ? 'Ancho Útil de Acera' : 'Clear Sidewalk Width'}
                </span>
                <div className="text-slate-100 font-mono font-bold text-sm">
                  1.80 m
                  <span className="text-[10px] text-emerald-400 font-normal ml-1">(&gt;1.20m)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  {language === 'es' ? 'Sanitario' : 'Restroom'}
                </span>
                <div className="text-slate-200 font-semibold flex items-center gap-1">
                  {poi.restroom_accessible ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Adaptado' : 'Accessible'}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {language === 'es' ? 'No adaptado' : 'Not adapted'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  {language === 'es' ? 'Auditoría en Campo' : 'Field Confidence'}
                </span>
                <div className="text-amber-400 font-mono font-bold text-sm">
                  96%
                  <span className="text-[10px] text-slate-400 font-normal ml-1">CC BY 4.0</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-amber-400 block text-[11px]">
                {language === 'es' ? 'Condiciones de Movilidad:' : 'Mobility Conditions:'}
              </span>
              <p className="text-[11px] leading-relaxed">
                {currentStop.accessibility_notes[language] || currentStop.accessibility_notes.es}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: HOLOGRAPHIC BADGE */}
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

        {/* TAB 4: MEMORIES */}
        {activeTab === 'memories' && (
          <div className="space-y-3 text-xs">
            {poi.historical_figures && poi.historical_figures.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block font-mono">
                  {language === 'es' ? 'Personajes Históricos' : 'Historical Figures'}
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
                  {language === 'es' ? 'Voces Comunitarias' : 'Community Voices'}
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
  );
};
