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
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {language === 'es' ? 'Comparador de Rutas Lado a Lado' : 'Side-by-Side Route Comparison'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'es'
              ? 'Contraste entre el itinerario clasico tradicional y las rutas optimizadas sostenibles'
              : 'Comparison between traditional tourist path and sustainable optimized alternatives'}
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
              className={`rounded-lg border p-4 transition flex flex-col justify-between ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{route.name}</span>
                  {isMain && (
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                      {language === 'es' ? 'Recomendada' : 'Optimized'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mb-3">
                  {route.stops.length} {language === 'es' ? 'paradas' : 'stops'}
                </div>

                {/* Lista de metricas clave */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Tiempo total:' : 'Total time:'}
                    </span>
                    <span className="font-semibold">{route.metrics.total_time_min} min</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Footprints className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Caminata:' : 'Walk distance:'}
                    </span>
                    <span className="font-semibold">{route.metrics.distance_meters} m</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <DollarSign className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Gasto estimado:' : 'Estimated cost:'}
                    </span>
                    <span className="font-semibold">${route.metrics.total_cost_mxn} MXN</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {language === 'es' ? 'Verificacion en campo:' : 'Field verified:'}
                      </span>
                      <span className="font-bold text-emerald-700">
                        {route.metrics.pct_verified}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Store className="w-3.5 h-3.5 text-blue-600" />
                        {language === 'es' ? 'Comercios locales:' : 'Local business:'}
                      </span>
                      <span className="font-bold text-blue-700">
                        {route.metrics.pct_local_stops}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        {language === 'es' ? 'Fuera del zocalo:' : 'Outside core:'}
                      </span>
                      <span className="font-bold text-indigo-700">
                        {route.metrics.pct_outside_core}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectRoute(route)}
                className={`mt-4 w-full py-2 px-3 rounded text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Ruta en mapa' : 'Active on map'}
                  </>
                ) : (
                  language === 'es' ? 'Ver en mapa' : 'Show on map'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
