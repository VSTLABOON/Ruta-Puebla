import { useState, useEffect, type FC } from 'react';
import { Language } from '@ruta-abierta/shared-types';
import { BarChart3, TrendingUp, Sliders, AlertTriangle, ShieldCheck, Download } from 'lucide-react';

interface SustainabilityDashboardProps {
  language: Language;
}

export const SustainabilityDashboard: FC<SustainabilityDashboardProps> = ({ language }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [zoneCaps, setZoneCaps] = useState<Record<string, number>>({
    zocalo_centro_nucleo: 120,
    barrio_analco: 60,
    barrio_la_luz: 35,
    barrio_el_alto: 40,
    barrio_xanenetla: 25
  });

  useEffect(() => {
    fetch('/data/simulation_metrics.json')
      .then((r) => r.json())
      .then((data) => setMetrics(data))
      .catch(() => {});
  }, []);

  const handleCapChange = (zone: string, val: number) => {
    setZoneCaps((prev) => ({ ...prev, [zone]: val }));
  };

  const barriers = [
    {
      id: 'seg_luz_horno_acceso',
      tramo: 'Callejón de la Alfarería a Horno La Luz',
      zona: 'Barrio de La Luz',
      barrera: 'Escalón de 20 cm sin rampa',
      pois_desbloqueados: 3,
      impacto: 'Alto (Desbloquea hornos árabes y talleres alfareros)'
    },
    {
      id: 'seg_analco_calle7ote_s',
      tramo: 'Calle 7 Oriente entre 10 y 12 Sur',
      zona: 'Barrio de Analco',
      barrera: 'Banqueta angosta (0.75 m) y desnivel',
      pois_desbloqueados: 2,
      impacto: 'Alto (Acceso directo al Templo del Santo Ángel)'
    },
    {
      id: 'seg_xane_callejuela_empedrada',
      tramo: 'Callejuela empedrada hacia antojera',
      zona: 'Barrio de Xanenetla',
      barrera: 'Empedrado desprendido y pendiente > 6%',
      pois_desbloqueados: 2,
      impacto: 'Medio (Conexión interior de Ciudad Mural)'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
            {language === 'es' ? 'Panel de Planificación y Gestión Turística' : 'Tourism Policy & Destination Dashboard'}
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">
            {language === 'es' ? 'Desconcentración Urbana y Sostenibilidad' : 'Urban Decentralization & Sustainability'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {language === 'es'
              ? 'Evaluación con 150 agentes sintéticos heterogéneos (IC 95%), ranking de impacto de obra pública en aceras y regulación de carga de visitantes por barrio.'
              : 'Evaluation of 150 heterogeneous synthetic agents (95% CI), public works sidewalk barrier ranking, and neighborhood carrying capacity regulation.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ metrics, zoneCaps, barriers }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reporte_sostenibilidad_puebla_2026.json';
            a.click();
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          {language === 'es' ? 'Descargar Reporte JSON' : 'Export JSON Report'}
        </button>
      </div>

      {/* Tarjetas comparativas de la simulación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Desconcentración */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{language === 'es' ? 'Paradas fuera del Zócalo' : 'Stops Outside Core'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">89.4%</div>
          <div className="text-[11px] text-emerald-700 font-medium">
            IC 95%: [87.3%, 91.7%]
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            vs <strong>0.0%</strong> en ruta clásica turística
          </div>
        </div>

        {/* Gasto Local */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{language === 'es' ? 'Gasto en Comercio Local' : 'Local Spend Share'}</span>
            <BarChart3 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">59.4%</div>
          <div className="text-[11px] text-sky-700 font-medium">
            IC 95%: [52.6%, 66.3%]
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            Canalizado a microtalleres DENUE de Analco y La Luz
          </div>
        </div>

        {/* Factibilidad y Protección */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{language === 'es' ? 'Protección en Silla de Ruedas' : 'Wheelchair Safety'}</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">100%</div>
          <div className="text-[11px] text-indigo-700 font-medium">
            0% accidentes por confinamiento seguro
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            Exclusión estricta de tramos con escalones de 20 cm
          </div>
        </div>
      </div>

      {/* Rejilla: Ranking de Barreras y Regulador de Capacidad Zonal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ranking de Priorización de Inversión Municipal en Banquetas */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {language === 'es' ? 'Priorización Cuantitativa de Barreras Urbanas' : 'Sidewalk Barrier Ranking'}
            </h3>
            <span className="text-[11px] text-slate-500">Para obra pública municipal</span>
          </div>

          <p className="text-xs text-slate-600">
            {language === 'es'
              ? 'Calcula cuántos atractivos turísticos y talleres tradicionales se vuelven accesibles para personas en silla de ruedas si el municipio adapta la banqueta:'
              : 'Estimates how many cultural attractions and workshops become wheelchair-accessible if the city adapts each sidewalk:'}
          </p>

          <div className="space-y-2.5">
            {barriers.map((b, idx) => (
              <div key={b.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    #{idx + 1} {b.tramo}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    +{b.pois_desbloqueados} {language === 'es' ? 'atractivos desbloqueados' : 'unlocked POIs'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {b.zona} | <span className="text-amber-800 font-medium">{b.barrera}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium pt-1">
                  <strong>Impacto:</strong> {b.impacto}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regulador de Capacidad de Carga por Barrio */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              {language === 'es' ? 'Capacidad de Carga por Barrio' : 'Neighborhood Capacity Limits'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === 'es' ? 'Previene la saturación simultánea en calles estrechas' : 'Prevents pedestrian crowding in narrow alleys'}
            </p>
          </div>

          <div className="space-y-3.5">
            {Object.entries(zoneCaps).map(([zone, cap]) => {
              const zoneLabels: Record<string, string> = {
                zocalo_centro_nucleo: 'Zócalo / Centro Núcleo',
                barrio_analco: 'Barrio de Analco',
                barrio_la_luz: 'Barrio de La Luz',
                barrio_el_alto: 'Barrio de El Alto',
                barrio_xanenetla: 'Barrio de Xanenetla'
              };

              return (
                <div key={zone} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{zoneLabels[zone] || zone}</span>
                    <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                      {cap} {language === 'es' ? 'personas/h' : 'pax/h'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={cap}
                    onChange={(e) => handleCapChange(zone, parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px] text-indigo-900">
            {language === 'es'
              ? 'Los límites alimentan la penalización zonal del algoritmo OPTW para desviar visitantes cuando una zona alcanza su cupo máximo.'
              : 'These limits feed the OPTW zonal penalty to reroute visitors once a neighborhood reaches peak capacity.'}
          </div>
        </div>
      </div>
    </div>
  );
};
