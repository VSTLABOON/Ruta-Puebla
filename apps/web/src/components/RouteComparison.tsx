import type { FC } from 'react';
import { RouteAlternative, Language } from '@ruta-abierta/shared-types';
import { CheckCircle2, ShieldCheck, Store, MapPin, Clock, Footprints, DollarSign } from 'lucide-react';

interface RouteComparisonProps {
  mainRoute: RouteAlternative;
  alternativeRoutes: RouteAlternative[];
  activeRouteName: string;
  onSelectRoute: (route: RouteAlternative) => void;
  language: Language;
}

export const RouteComparison: FC<RouteComparisonProps> = ({
  mainRoute,
  alternativeRoutes,
  activeRouteName,
  onSelectRoute,
  language
}) => {
  const allRoutes = [mainRoute, ...alternativeRoutes];

  return (
    <div className="bg-[var(--well)] rounded-2xl border border-[var(--line)] p-5 shadow-[var(--shadow)] space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-[var(--ink)]">
            {language === 'es' ? 'Comparador Multicriterio de Rutas (En Vivo)' : 'Live Multicriteria Route Comparison'}
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {language === 'es'
              ? 'Contraste instantáneo entre el itinerario clásico del Zócalo y las alternativas desconcentradas'
              : 'Instant comparison between the classic Zócalo path and decentralized alternatives'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {allRoutes.map((route, idx) => {
          const isSelected = route.name === activeRouteName;
          const isMain = idx === 0;

          return (
            <div
              key={route.name}
              onClick={() => onSelectRoute(route)}
              className={`rounded-xl border p-4 transition flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-[var(--line)] bg-[var(--accent-soft)] ring-1 ring-[var(--line-strong)] shadow-md'
                  : 'border-[var(--line)] hover:border-[var(--line)] bg-[var(--surface)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs font-extrabold text-[var(--ink)]">{route.name}</span>
                  {isMain && (
                    <span className="text-[10px] bg-[var(--accent)] text-[var(--accent-ink)] font-black px-2 py-0.5 rounded-full flex-shrink-0">
                      {language === 'es' ? 'Óptima OPTW' : 'OPTW Optimal'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-[var(--brand)] font-bold mb-3">
                  {route.stops.length} {language === 'es' ? 'paradas activas' : 'active stops'}
                </div>

                {/* Lista de métricas clave */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[var(--ink)]">
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <Clock className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Tiempo total:' : 'Total time:'}
                    </span>
                    <span className="font-mono font-semibold">{route.metrics.total_time_min} min</span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--ink)]">
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <Footprints className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Caminata:' : 'Walk distance:'}
                    </span>
                    <span className="font-mono font-semibold">{route.metrics.distance_meters} m</span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--ink)]">
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <DollarSign className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Gasto estimado:' : 'Estimated cost:'}
                    </span>
                    <span className="font-mono font-semibold">${route.metrics.total_cost_mxn} MXN</span>
                  </div>

                  <div className="pt-2 border-t border-[var(--line)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[var(--muted)]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--ok-ink)]" />
                        {language === 'es' ? 'Verificación en campo:' : 'Field verified:'}
                      </span>
                      <span className="font-mono font-bold text-[var(--ok-ink)]">
                        {route.metrics.pct_verified}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[var(--muted)]">
                        <Store className="w-3.5 h-3.5 text-[var(--brand)]" />
                        {language === 'es' ? 'Comercios locales:' : 'Local business:'}
                      </span>
                      <span className="font-mono font-bold text-[var(--brand)]">
                        {route.metrics.pct_local_stops}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[var(--muted)]">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        {language === 'es' ? 'Fuera del Zócalo:' : 'Outside core:'}
                      </span>
                      <span className="font-mono font-bold text-[var(--brand)]">
                        {route.metrics.pct_outside_core}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRoute(route);
                }}
                className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow'
                    : 'bg-[var(--well)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--well)]'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Inspeccionando Desglose S_i' : 'Inspecting S_i Breakdown'}
                  </>
                ) : (
                  language === 'es' ? 'Inspeccionar Utilidad S_i' : 'Inspect S_i Utility'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
