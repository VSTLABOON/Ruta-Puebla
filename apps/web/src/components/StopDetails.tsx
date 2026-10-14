import { useState, type FC } from 'react';
import { RouteStop, Language, PassportState } from '@ruta-abierta/shared-types';
import { Store, Accessibility, Check, X, Info, Sparkles, Award, History, MessageSquare, Compass } from 'lucide-react';

interface StopDetailsProps {
  stops: RouteStop[];
  selectedStopPoiId: string | null;
  onSelectStop: (poiId: string) => void;
  language: Language;
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
}

export const StopDetails: FC<StopDetailsProps> = ({
  stops,
  selectedStopPoiId,
  onSelectStop,
  language,
  passportState,
  onUnlockSecret
}) => {
  const [activeTabByPoi, setActiveTabByPoi] = useState<Record<string, 'route' | 'secret' | 'memory'>>({});

  const formatMinutesToHour = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getActiveTab = (poiId: string) => activeTabByPoi[poiId] || 'route';

  const setTab = (poiId: string, tab: 'route' | 'secret' | 'memory') => {
    setActiveTabByPoi((prev) => ({ ...prev, [poiId]: tab }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {language === 'es' ? 'Itinerario de Paradas y Patrimonio Vivo' : 'Stops Itinerary & Living Heritage'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'es'
              ? 'Horarios, accesibilidad física, secretos ocultos desbloqueables y memoria histórica del lugar'
              : 'Timetable, accessibility, unlockable secrets, and historical memories for each stop'}
          </p>
        </div>

        {/* Resumen del Pasaporte */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs">
          <Award className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-slate-900">
            {language === 'es' ? 'Pasaporte de Exploración:' : 'Passport:'}
          </span>
          <span className="bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded text-[11px]">
            {passportState.unlocked_secrets.length} / {stops.length} {language === 'es' ? 'sellados' : 'unlocked'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {stops.map((stop) => {
          const isSelected = stop.poi.id === selectedStopPoiId;
          const { score_breakdown: sb } = stop;
          const isSecretUnlocked = passportState.unlocked_secrets.includes(stop.poi.id);
          const currentTab = getActiveTab(stop.poi.id);
          const secret = stop.poi.secret_to_unlock;
          const historicalFigures = stop.poi.historical_figures || [];
          const memories = stop.poi.community_memories || [];

          return (
            <div
              key={stop.poi.id}
              onClick={() => onSelectStop(stop.poi.id)}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-400/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {/* Encabezado de la parada */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    {stop.stop_order}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{stop.poi.name}</h3>
                      {isSecretUnlocked && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          {language === 'es' ? 'Sellado' : 'Stamped'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {stop.poi.address} |{' '}
                      <span className="font-medium text-slate-700">{stop.poi.zone.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-slate-900">
                    {formatMinutesToHour(stop.arrival_time_min)} - {formatMinutesToHour(stop.departure_time_min)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {stop.cost_mxn === 0 ? (language === 'es' ? 'Gratis' : 'Free') : `$${stop.cost_mxn} MXN`}
                  </div>
                </div>
              </div>

              {/* Botones de navegación interna por parada */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 pt-3 pb-2 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTab(stop.poi.id, 'route');
                  }}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition ${
                    currentTab === 'route'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  {language === 'es' ? 'Ruta y Accesibilidad' : 'Route & Access'}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTab(stop.poi.id, 'secret');
                  }}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition ${
                    currentTab === 'secret'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {language === 'es' ? 'Secreto de Exploración' : 'Discovery Secret'}
                  {isSecretUnlocked && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTab(stop.poi.id, 'memory');
                  }}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition ${
                    currentTab === 'memory'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  {language === 'es' ? 'Quiénes estuvieron aquí' : 'Who was here'}
                </button>
              </div>

              {/* CONTENIDO PESTAÑA 1: RUTA Y ACCESIBILIDAD */}
              {currentTab === 'route' && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {stop.poi.is_local_business && (
                      <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-medium">
                        <Store className="w-3 h-3" />
                        {language === 'es' ? 'Pequeño comercio local tradicional' : 'Traditional local business'}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      <Accessibility className="w-3 h-3" />
                      {stop.poi.entrance_accessible ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          {language === 'es' ? 'Entrada al nivel de banqueta' : 'Step-free entrance'}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium flex items-center gap-0.5">
                          <X className="w-3 h-3" />
                          {language === 'es' ? 'Escalón en acceso' : 'Step at entrance'}
                        </span>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    {language === 'es' ? stop.poi.description.es : stop.poi.description.en}
                  </p>

                  {/* Descomposición S_i */}
                  <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
                      <span className="flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        {language === 'es' ? 'Descomposición de Utilidad (S_i):' : 'Score Decomposition (S_i):'}
                      </span>
                      <span className="font-bold text-amber-700">{sb.total_s_i} pts</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <div className="text-slate-500">{language === 'es' ? 'Interés:' : 'Interest:'}</div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${sb.interest_similarity * 100}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">{(sb.interest_similarity * 100).toFixed(0)}%</div>
                      </div>

                      <div>
                        <div className="text-slate-500">{language === 'es' ? 'Presupuesto:' : 'Budget:'}</div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${sb.budget_fit * 100}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">{(sb.budget_fit * 100).toFixed(0)}%</div>
                      </div>

                      <div>
                        <div className="text-slate-500">{language === 'es' ? 'Dispersión:' : 'Dispersion:'}</div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${sb.dispersion_bonus * 100}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">{(sb.dispersion_bonus * 100).toFixed(0)}%</div>
                      </div>

                      <div>
                        <div className="text-slate-500">{language === 'es' ? 'Bono local:' : 'Local:'}</div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: `${sb.local_business_bonus * 100}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">{(sb.local_business_bonus * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENIDO PESTAÑA 2: SECRETO POKÉMON GO */}
              {currentTab === 'secret' && secret && (
                <div className="space-y-3 pt-2">
                  <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        {secret.titulo}
                      </span>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        {secret.insignia_nombre}
                      </span>
                    </div>

                    {!isSecretUnlocked ? (
                      <div className="space-y-3">
                        <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-amber-100">
                          <span className="font-semibold text-slate-800">
                            {language === 'es' ? 'Pista para descubrir en el sitio:' : 'Discovery hint on site:'}
                          </span>{' '}
                          {secret.pista}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnlockSecret(stop.poi.id, secret.insignia_nombre);
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg shadow transition flex items-center justify-center gap-1.5"
                        >
                          <Award className="w-4 h-4" />
                          {language === 'es' ? 'Sellar Pasaporte y Revelar Secreto' : 'Stamp Passport & Reveal Secret'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-amber-200">
                        <div className="text-xs text-slate-700 leading-relaxed font-normal">
                          {secret.descripcion}
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-800">
                          <span className="font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            {language === 'es' ? 'Insignia otorgada:' : 'Badge awarded:'} {secret.insignia_nombre}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {language === 'es' ? 'Sellado en el dispositivo' : 'Stored locally'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CONTENIDO PESTAÑA 3: QUIÉNES ESTUVIERON AQUÍ */}
              {currentTab === 'memory' && (
                <div className="space-y-3 pt-2">
                  {/* Personajes Históricos */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-slate-600" />
                      {language === 'es' ? 'Huella Histórica Virreinal y Republicana' : 'Historical Figures'}
                    </div>

                    {historicalFigures.length > 0 ? (
                      <div className="space-y-1.5">
                        {historicalFigures.map((fig, fIdx) => (
                          <div key={fIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{fig.nombre}</span>
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                                {fig.epoca}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">{fig.rol}</div>
                            <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{fig.relato}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        {language === 'es' ? 'Sin registros históricos específicos cargados.' : 'No historical records loaded.'}
                      </p>
                    )}
                  </div>

                  {/* Testimonios y Memoria Comunitaria */}
                  {memories.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                        {language === 'es' ? 'Muro de Visitantes y Vecinos' : 'Community Guestbook'}
                      </div>
                      <div className="space-y-1.5">
                        {memories.map((m) => (
                          <div key={m.id} className="bg-sky-50/40 p-2.5 rounded-lg border border-sky-100 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800">{m.autor} ({m.procedencia})</span>
                              <span className="text-slate-400 text-[10px]">{m.fecha}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] italic">"{m.testimonio}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
