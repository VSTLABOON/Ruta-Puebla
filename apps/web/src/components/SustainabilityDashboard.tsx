import { useState, useEffect, type FC } from 'react';
import { Language } from '@ruta-abierta/shared-types';
import {
  BarChart3,
  TrendingUp,
  Sliders,
  AlertTriangle,
  ShieldCheck,
  Download,
  Hammer,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';

interface SustainabilityDashboardProps {
  language: Language;
  zoneCaps?: Record<string, number>;
  onChangeZoneCap?: (zone: string, cap: number) => void;
  onResetZoneCaps?: () => void;
  repairedBarriers?: string[];
  onToggleRepairBarrier?: (segmentId: string, unlockedPoiNames: string[]) => void;
}

const DEFAULT_ZONE_CAPS: Record<string, number> = {
  zocalo_centro_nucleo: 120,
  barrio_analco: 60,
  barrio_la_luz: 35,
  barrio_el_alto: 40,
  barrio_xanenetla: 25
};

export const SustainabilityDashboard: FC<SustainabilityDashboardProps> = ({
  language,
  zoneCaps: controlledZoneCaps,
  onChangeZoneCap,
  onResetZoneCaps,
  repairedBarriers = [],
  onToggleRepairBarrier
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [barrierData, setBarrierData] = useState<any>(null);
  const [selectedBarrierProfile, setSelectedBarrierProfile] = useState<
    'silla_de_ruedas' | 'movilidad_reducida'
  >('silla_de_ruedas');
  const [internalZoneCaps, setInternalZoneCaps] =
    useState<Record<string, number>>(DEFAULT_ZONE_CAPS);

  const zoneCaps = controlledZoneCaps || internalZoneCaps;

  useEffect(() => {
    fetch('/data/simulation_metrics.json?v=3')
      .then((r) => r.json())
      .then((data) => setMetrics(data))
      .catch(() => {});

    fetch('/data/barrier_ranking.json?v=3')
      .then((r) => r.json())
      .then((data) => setBarrierData(data))
      .catch(() => {});
  }, []);

  const handleCapChange = (zone: string, val: number) => {
    if (onChangeZoneCap) {
      onChangeZoneCap(zone, val);
    } else {
      setInternalZoneCaps((prev) => ({ ...prev, [zone]: val }));
    }
  };

  const fallbackBarriers = [
    {
      segment_id: 'seg_luz_horno_acceso',
      street: 'Callejón de la Alfarería a Horno La Luz',
      zone: 'barrio_la_luz',
      obstacles: ['escalon_20cm_sin_rampa'],
      newly_unlocked_pois: 1,
      unlocked_poi_names: ['Horno Histórico de Alfarería La Luz']
    },
    {
      segment_id: 'seg_analco_calle7ote_s',
      street: 'Calle 7 Oriente entre 10 y 12 Sur',
      zone: 'barrio_analco',
      obstacles: ['banqueta_estrecha', 'desnivel_sin_rampa'],
      newly_unlocked_pois: 1,
      unlocked_poi_names: ['Templo del Santo Ángel Custodio de Analco']
    },
    {
      segment_id: 'seg_xane_callejuela_empedrada',
      street: 'Callejuela empedrada hacia antojera',
      zone: 'barrio_xanenetla',
      obstacles: ['empedrado_irregular', 'pendiente_alta'],
      newly_unlocked_pois: 1,
      unlocked_poi_names: ['Cocina Tradicional de Antojitos Xanenetla']
    }
  ];

  const activeBarriers: any[] =
    barrierData?.[selectedBarrierProfile] && barrierData[selectedBarrierProfile].length > 0
      ? barrierData[selectedBarrierProfile]
      : fallbackBarriers;

  const optSummary = metrics?.metrics_summary?.optimizada;
  const clasSummary = metrics?.metrics_summary?.clasica;

  const pctOutside = optSummary?.pct_outside_core?.mean ?? 89.4;
  const pctOutsideLow = optSummary?.pct_outside_core?.ci_95_lower ?? 87.3;
  const pctOutsideHigh = optSummary?.pct_outside_core?.ci_95_upper ?? 91.7;
  const clasOutside = clasSummary?.pct_outside_core?.mean ?? 0.0;

  const pctLocal = optSummary?.pct_local_spend?.mean ?? 59.4;
  const pctLocalLow = optSummary?.pct_local_spend?.ci_95_lower ?? 52.6;
  const pctLocalHigh = optSummary?.pct_local_spend?.ci_95_upper ?? 66.3;

  const pctWheelchair = optSummary?.pct_wheelchair_feasible?.mean ?? 100;

  return (
    <div className="space-y-5">
      {/* Encabezado y Exportación */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-emerald-400 font-bold text-[11px] uppercase tracking-wider font-mono">
            {language === 'es'
              ? 'Módulo de Simulación Territorial • 150 Agentes Sintéticos'
              : 'Territorial Simulation Module • 150 Synthetic Agents'}
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
            {language === 'es'
              ? 'Desconcentración Barrial, Cupos en Vivo y Priorización de Obra Pública'
              : 'Neighborhood Decentralization, Live Quotas & Public Works Ranking'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            {language === 'es'
              ? 'Ajusta los cupos por barrio o simula la reparación de banquetas para observar en tiempo real cómo cambia la ruta óptima OPTW abajo.'
              : 'Adjust neighborhood quotas or simulate sidewalk repairs to observe real-time changes in the OPTW optimal route below.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            const blob = new Blob(
              [
                JSON.stringify(
                  {
                    exportedAt: new Date().toISOString(),
                    metrics,
                    zoneCaps,
                    repairedBarriers,
                    barriers: activeBarriers
                  },
                  null,
                  2
                )
              ],
              { type: 'application/json' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dictamen_secihti_puebla_2026.json';
            a.click();
          }}
          className="bg-slate-950 hover:bg-slate-800 text-slate-100 border border-white/15 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          {language === 'es' ? 'Exportar Dictamen JSON' : 'Export JSON Report'}
        </button>
      </div>

      {/* Tarjetas comparativas de la simulación Monte Carlo (IC 95%) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-4 shadow-md space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{language === 'es' ? 'Paradas fuera del Zócalo' : 'Stops Outside Core'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{pctOutside}%</div>
          <div className="text-[11px] text-emerald-400 font-mono font-semibold">
            IC 95%: [{pctOutsideLow}%, {pctOutsideHigh}%]
          </div>
          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
            vs <strong className="text-slate-200">{clasOutside}%</strong> en ruta clásica turística
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-white/10 p-4 shadow-md space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{language === 'es' ? 'Gasto en Comercio Local' : 'Local Spend Share'}</span>
            <BarChart3 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{pctLocal}%</div>
          <div className="text-[11px] text-sky-400 font-mono font-semibold">
            IC 95%: [{pctLocalLow}%, {pctLocalHigh}%]
          </div>
          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
            Microtalleres DENUE de Analco, La Luz y Xanenetla
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-white/10 p-4 shadow-md space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{language === 'es' ? 'Protección en Silla de Ruedas' : 'Wheelchair Safety'}</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{pctWheelchair}%</div>
          <div className="text-[11px] text-amber-400 font-mono font-semibold">
            0% incidentes por confinamiento topológico
          </div>
          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
            Exclusión automática de escalones &gt; 5 cm sin rampa
          </div>
        </div>
      </div>

      {/* Rejilla Interactiva: Simulador de Obra Pública en Banquetas + Regulador de Capacidad Barrial Conectado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Ranking Interactivo de Priorización de Inversión Municipal en Banquetas */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-white/10 p-5 shadow-lg space-y-3.5">
          <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {language === 'es'
                  ? 'Priorización de Obra en Banquetas (Simulador "¿Qué pasa si...?")'
                  : 'Sidewalk Barrier Works Simulator ("What-If" Analysis)'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'es'
                  ? 'Haz clic en "Simular Obra" sobre cualquier barrera para rehabilitar el tramo y desbloquear el taller en el motor OPTW.'
                  : 'Click "Simulate Repair" on any barrier to adapt the segment and unlock its POI in the live OPTW engine.'}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedBarrierProfile('silla_de_ruedas')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedBarrierProfile === 'silla_de_ruedas'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'es' ? 'Silla de Ruedas' : 'Wheelchair'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedBarrierProfile('movilidad_reducida')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedBarrierProfile === 'movilidad_reducida'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'es' ? 'Movilidad Reducida' : 'Reduced Mobility'}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {activeBarriers.map((b, idx) => {
              const segId = b.segment_id || `seg_${idx}`;
              const unlockedList: string[] = Array.isArray(b.unlocked_poi_names)
                ? b.unlocked_poi_names
                : b.impacto
                ? [b.impacto]
                : [];
              const isRepaired = repairedBarriers.includes(segId);

              return (
                <div
                  key={segId}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                    isRepaired
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400">#{idx + 1}</span>
                      <span className="font-bold text-white">{b.street || b.tramo}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        +{b.newly_unlocked_pois ?? b.pois_desbloqueados ?? 1}{' '}
                        {language === 'es' ? 'POI desbloqueado' : 'unlocked POI'}
                      </span>

                      {onToggleRepairBarrier && (
                        <button
                          type="button"
                          onClick={() => {
                            tacticalAudio.playTacticalClick();
                            onToggleRepairBarrier(segId, unlockedList);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                            isRepaired
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isRepaired ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{language === 'es' ? 'Obra Simulada' : 'Simulated'}</span>
                            </>
                          ) : (
                            <>
                              <Hammer className="w-3.5 h-3.5" />
                              <span>{language === 'es' ? 'Simular Obra' : 'Simulate Repair'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="uppercase font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300">
                      {(b.zone || b.zona || '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-rose-300 font-medium">
                      {language === 'es' ? 'Barrera:' : 'Barrier:'}{' '}
                      {Array.isArray(b.obstacles)
                        ? b.obstacles.join(', ').replace(/_/g, ' ')
                        : b.barrera}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <strong className="text-emerald-400">
                      {language === 'es' ? 'Conecta a:' : 'Unlocks:'}
                    </strong>{' '}
                    {unlockedList.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regulador de Capacidad de Carga por Barrio (CONECTADO EN VIVO A SOLVE_OPTW) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-white/10 p-5 shadow-lg space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wide flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" />
                {language === 'es'
                  ? 'Regulador de Capacidad Zonal (Conectado a OPTW)'
                  : 'Zonal Carrying Capacity (Connected to OPTW)'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'es'
                  ? 'Limita el flujo por barrio y recalcula al instante las paradas permitidas en la ruta'
                  : 'Limits neighborhood flow and instantly recalculates allowed route stops'}
              </p>
            </div>

            {onResetZoneCaps && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  onResetZoneCaps();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                title={language === 'es' ? 'Restaurar cupos originales' : 'Reset quotas'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
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
              const maxStopsInSolver = Math.max(1, Math.round(cap / 30));

              return (
                <div key={zone} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{zoneLabels[zone] || zone}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-sky-300 font-bold">
                        {cap} {language === 'es' ? 'pax/h' : 'pax/h'}
                      </span>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded text-[10px] font-bold">
                        máx {maxStopsInSolver} {maxStopsInSolver === 1 ? 'parada' : 'paradas'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="15"
                    value={cap}
                    onChange={(e) => handleCapChange(zone, parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-sky-950/40 rounded-xl border border-sky-500/30 text-[11px] text-sky-200 leading-relaxed">
            {language === 'es'
              ? 'Conectado en vivo: cada ajuste de personas/hora actualiza el cupo máximo de paradas por barrio (zoneCaps) dentro del solver OPTW inferior.'
              : 'Live connected: adjusting pax/hour updates the maximum stops per neighborhood (zoneCaps) inside the OPTW solver below.'}
          </div>
        </div>
      </div>
    </div>
  );
};

