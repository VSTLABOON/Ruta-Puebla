import { useState, useEffect, type FC } from 'react';
import { Language } from '@ruta-abierta/shared-types';
import {
  Sliders,
  AlertTriangle,
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
  const [barrierData, setBarrierData] = useState<any>(null);
  const [selectedBarrierProfile, setSelectedBarrierProfile] = useState<
    'silla_de_ruedas' | 'movilidad_reducida'
  >('silla_de_ruedas');
  const [internalZoneCaps, setInternalZoneCaps] =
    useState<Record<string, number>>(DEFAULT_ZONE_CAPS);

  const zoneCaps = controlledZoneCaps || internalZoneCaps;

  useEffect(() => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-fade-slide">
      {/* Columna Izquierda (7 cols): Simulador de Inversión en Banquetas */}
      <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-white/10 p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {language === 'es'
                ? 'Priorización de Obras en Banquetas ("¿Qué pasa si...?")'
                : 'Sidewalk Works Simulator ("What-If" Analysis)'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'es'
                ? 'Simula la reparación de banquetas para ver cómo se habilitan los talleres en el mapa.'
                : 'Simulate repairs to see how workshops unlock on the pedestrian map.'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-[10px]">
            <button
              type="button"
              onClick={() => setSelectedBarrierProfile('silla_de_ruedas')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedBarrierProfile === 'silla_de_ruedas'
                  ? 'bg-amber-500 text-slate-950 shadow'
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
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'es' ? 'Movilidad Reducida' : 'Reduced Mobility'}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
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
                className={`p-3 rounded-xl border text-xs space-y-2 transition ${
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
                    <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      +{b.newly_unlocked_pois ?? b.pois_desbloqueados ?? 1}{' '}
                      {language === 'es' ? 'lugar habilitado' : 'unlocked venue'}
                    </span>

                    {onToggleRepairBarrier && (
                      <button
                        type="button"
                        onClick={() => {
                          tacticalAudio.playTacticalClick();
                          onToggleRepairBarrier(segId, unlockedList);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          isRepaired
                            ? 'bg-emerald-500 text-slate-950 shadow'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isRepaired ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'es' ? 'Reparada' : 'Repaired'}</span>
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
                    {language === 'es' ? 'Obstáculo:' : 'Obstacle:'}{' '}
                    {Array.isArray(b.obstacles)
                      ? b.obstacles.join(', ').replace(/_/g, ' ')
                      : b.barrera}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300">
                  <strong className="text-emerald-400">
                    {language === 'es' ? 'Habilita acceso a:' : 'Enables access to:'}
                  </strong>{' '}
                  {unlockedList.join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha (5 cols): Regulador de Capacidad de Carga por Barrio */}
      <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-white/10 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="border-b border-white/10 pb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wide flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              {language === 'es'
                ? 'Cupos de Capacidad Barrial (Anti-Saturación)'
                : 'Neighborhood Capacity Quotas'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'es'
                ? 'Evita la masificación regulando el aforo de caminantes por hora.'
                : 'Prevents overcrowding by capping visitors per hour.'}
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

        <div className="space-y-3">
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
              <div key={zone} className="space-y-1 bg-slate-950/70 p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{zoneLabels[zone] || zone}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-sky-300 font-bold">
                      {cap} {language === 'es' ? 'caminantes/h' : 'walkers/h'}
                    </span>
                    <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded text-[10px] font-bold">
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

        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-white/10 pt-2.5">
          {language === 'es'
            ? 'Los límites calibrados regulan las rutas generadas por el sistema para proteger la habitabilidad y tranquilidad de los vecinos de los barrios.'
            : 'Quotas govern generated itineraries to preserve neighborhood life and prevent tourism saturation.'}
        </p>
      </div>
    </div>
  );
};
export default SustainabilityDashboard;
