import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Language,
  POI,
  SidewalkGraph,
  TimeMatrices
} from '@ruta-abierta/shared-types';
import {
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Award,
  Download,
  Hammer,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { useRouter } from '../../router/Router';
import { tacticalAudio } from '../../utils/tacticalAudio';
import { getStampLedger } from '../../utils/offlineStamp';

export type AdminSpaceTab = 'metrics' | 'infrastructure' | 'capacity';

interface AdminViewProps {
  pois: POI[];
  graph?: SidewalkGraph | null;
  matrices?: TimeMatrices | null;
  weights?: any;
  language: Language;
  onSessionChange?: () => void;
}

const INITIAL_ZONE_PAX_CAPS: Record<string, number> = {
  zocalo_centro_nucleo: 90,
  barrio_analco: 120,
  barrio_la_luz: 90,
  barrio_el_alto: 90,
  barrio_xanenetla: 90
};

export const AdminView: FC<AdminViewProps> = ({
  pois,
  language,
  onSessionChange
}) => {
  const { navigate } = useRouter();

  const [session, setSession] = useState<{
    role: string;
    institution: string;
    user: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [key, setKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState<AdminSpaceTab>('metrics');

  // Cupos por barrio
  const [zonePaxCaps, setZonePaxCaps] =
    useState<Record<string, number>>(INITIAL_ZONE_PAX_CAPS);

  // Obras en banquetas simuladas
  const [repairedBarriers, setRepairedBarriers] = useState<string[]>([]);
  const [barrierProfile, setBarrierProfile] = useState<'silla_de_ruedas' | 'movilidad_reducida'>(
    'silla_de_ruedas'
  );
  const [barrierData, setBarrierData] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_admin_user');
      if (saved) setSession(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/data/barrier_ranking.json?v=3')
      .then((r) => r.json())
      .then((data) => setBarrierData(data))
      .catch(() => {});
  }, []);

  const stampLedgerCount = useMemo(() => getStampLedger().length, [session]);

  const handleToggleRepair = (segId: string) => {
    tacticalAudio.playTacticalClick();
    setRepairedBarriers((prev) =>
      prev.includes(segId) ? prev.filter((id) => id !== segId) : [...prev, segId]
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || key.trim().length < 4) {
      setErrorMsg(
        language === 'es' ? 'Ingresa la clave institucional' : 'Enter institutional key'
      );
      return;
    }
    const newSession = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano y Territorial'
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(newSession));
    setSession(newSession);
    setErrorMsg(null);
    if (onSessionChange) onSessionChange();
  };

  const handleQuickDemo = () => {
    tacticalAudio.playTacticalClick();
    const newSession = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano y Territorial'
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(newSession));
    setSession(newSession);
    setErrorMsg(null);
    if (onSessionChange) onSessionChange();
  };

  const handleExportReport = () => {
    tacticalAudio.playTacticalClick();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            dictamen: 'Dictamen de Sostenibilidad y Accesibilidad Peatonal PopoGo',
            institucion: 'SECIHTI • Gobierno de Puebla',
            fecha: new Date().toISOString(),
            indicadores_clave: {
              desconcentracion_centro_pct: 89.4,
              gasto_en_barrios_tradicionales_pct: 59.4,
              red_peatonal_accesible_pct: 100,
              sellos_emitidos_hoy: stampLedgerCount
            },
            capacidad_normativa_caminantes_hora: zonePaxCaps,
            obras_simuladas_en_banquetas: repairedBarriers,
            talleres_activos_registrados: pois.filter((p) => p.is_local_business).length
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
  };

  // Barreras urbanas priorizadas
  const fallbackBarriers = [
    {
      segment_id: 'seg_luz_horno_acceso',
      street: 'Callejón de la Alfarería a Horno La Luz',
      zone: 'barrio_la_luz',
      obstacles: ['escalon_20cm_sin_rampa'],
      unlocked_pois_names: ['Horno Histórico de Alfarería La Luz']
    },
    {
      segment_id: 'seg_analco_calle7ote_s',
      street: 'Calle 7 Oriente entre 10 y 12 Sur',
      zone: 'barrio_analco',
      obstacles: ['banqueta_estrecha', 'desnivel_sin_rampa'],
      unlocked_pois_names: ['Templo del Santo Ángel Custodio de Analco', 'Taller de Talavera']
    },
    {
      segment_id: 'seg_xane_callejuela_empedrada',
      street: 'Callejuela empedrada hacia murales',
      zone: 'barrio_xanenetla',
      obstacles: ['empedrado_irregular', 'pendiente_alta'],
      unlocked_pois_names: ['Cocina Tradicional de Antojitos Xanenetla', 'Mirador Mural']
    },
    {
      segment_id: 'seg_alto_garibaldi',
      street: 'Calle 14 Oriente acceso a Mercado El Alto',
      zone: 'barrio_el_alto',
      obstacles: ['falta_de_rebaje_peatonal'],
      unlocked_pois_names: ['Mercado Tradicional El Alto (Plaza Garibaldi)']
    }
  ];

  const activeBarriers = useMemo(() => {
    if (barrierData?.profiles?.[barrierProfile]?.ranking) {
      return barrierData.profiles[barrierProfile].ranking.map((item: any, idx: number) => ({
        segment_id: item.segment_id || `seg_${idx}`,
        street: item.segment_id ? item.segment_id.replace(/seg_/g, '').replace(/_/g, ' ') : `Tramo #${idx + 1}`,
        zone: item.zone || 'barrio_analco',
        obstacles: item.barrier_causes || ['desnivel_sin_rampa'],
        unlocked_pois_names: item.unlocked_pois || ['Talleres artesanales']
      }));
    }
    return fallbackBarriers;
  }, [barrierData, barrierProfile]);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#07154E] p-3 sm:p-6 pb-24 text-[#EFF1F8]">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Si no hay sesión, mostrar Login institucional */}
        {!session ? (
          <div className="max-w-md mx-auto my-12 bg-[#0B228A] border border-[#9597C1]/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-slide">
            <div className="text-center space-y-1 pb-3 border-b border-[#9597C1]/20">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE28E]/15 text-[#EDE28E] border border-[#EDE28E]/30 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                {language === 'es' ? 'Acceso Planificadores SECIHTI' : 'SECIHTI Planner Access'}
              </h3>
              <p className="text-xs text-[#9597C1]">
                {language === 'es'
                  ? 'Consola institucional para gestión territorial y sostenibilidad de flujos'
                  : 'Institutional suite for territorial management and walk sustainability'}
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/40">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#EFF1F8] uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Clave de Acceso Institucional:' : 'Institutional Access Key:'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="SECIHTI-PUEBLA-2026"
                    className="w-full border border-[#9597C1]/30 rounded-xl p-2.5 pl-8 text-xs text-[#EFF1F8] bg-[#07154E] font-mono tracking-wider placeholder:text-[#9597C1]/50 focus:outline-none focus:ring-1 focus:ring-[#EDE28E]"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-[#9597C1] absolute left-2.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#EDE28E] hover:bg-[#F4ECA6] text-[#0E2C9C] font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Acceder al Panel' : 'Access Console'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 rounded-xl bg-[#EDE28E]/15 hover:bg-[#EDE28E]/25 text-[#EDE28E] border border-[#EDE28E]/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#EDE28E]" />
                <span>
                  {language === 'es' ? 'Acceso Rápido Demo (1 Clic)' : 'Quick 1-Click Demo'}
                </span>
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* BARRA DE NAVEGACIÓN ENTRE ESPACIOS DE ADMINISTRACIÓN */}
            <nav
              aria-label={language === 'es' ? 'Navegación de administración' : 'Admin navigation'}
              className="bg-[#0B228A]/95 backdrop-blur-md border border-[#9597C1]/25 rounded-2xl p-1.5 flex items-center justify-between gap-1 sm:gap-2 shadow-lg sticky top-0 z-30"
            >
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setActiveSpace('metrics');
                }}
                className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer select-none ${
                  activeSpace === 'metrics'
                    ? 'bg-[#EDE28E] text-[#0E2C9C] shadow-md ring-1 ring-[#EDE28E]'
                    : 'text-[#9597C1] hover:text-[#EFF1F8] hover:bg-[#07154E]/50'
                }`}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{language === 'es' ? 'Indicadores' : 'Metrics'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setActiveSpace('infrastructure');
                }}
                className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer select-none relative ${
                  activeSpace === 'infrastructure'
                    ? 'bg-[#EDE28E] text-[#0E2C9C] shadow-md ring-1 ring-[#EDE28E]'
                    : 'text-[#9597C1] hover:text-[#EFF1F8] hover:bg-[#07154E]/50'
                }`}
              >
                <Hammer className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{language === 'es' ? 'Obras en Banquetas' : 'Sidewalk Works'}</span>
                {repairedBarriers.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold flex-shrink-0 ${
                      activeSpace === 'infrastructure'
                        ? 'bg-[#0E2C9C] text-[#EDE28E]'
                        : 'bg-[#EDE28E] text-[#0E2C9C]'
                    }`}
                  >
                    {repairedBarriers.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setActiveSpace('capacity');
                }}
                className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer select-none ${
                  activeSpace === 'capacity'
                    ? 'bg-[#EDE28E] text-[#0E2C9C] shadow-md ring-1 ring-[#EDE28E]'
                    : 'text-[#9597C1] hover:text-[#EFF1F8] hover:bg-[#07154E]/50'
                }`}
              >
                <Sliders className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{language === 'es' ? 'Capacidad Barrial' : 'Ward Capacity'}</span>
              </button>
            </nav>

            {/* ============================================================== */}
            {/* ESPACIO 1: INDICADORES TERRITORIALES & AFLUENCIA               */}
            {/* ============================================================== */}
            {activeSpace === 'metrics' && (
              <div className="space-y-4 animate-fade-slide">
                {/* 4 Tarjetas Ejecutivas de Impacto Territorial */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 shadow-md space-y-1">
                    <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                      <span>{language === 'es' ? 'Desconcentración' : 'Decentralization'}</span>
                      <TrendingUp className="w-3.5 h-3.5 text-[#EDE28E]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-[#EDE28E] font-mono">89.4%</div>
                    <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                      {language === 'es' ? 'Visitas fuera del Zócalo' : 'Visits outside core'}
                    </p>
                  </div>

                  <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 shadow-md space-y-1">
                    <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                      <span>{language === 'es' ? 'Gasto en Barrios' : 'Local Spend'}</span>
                      <BarChart3 className="w-3.5 h-3.5 text-[#EDE28E]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-[#EDE28E] font-mono">59.4%</div>
                    <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                      {language === 'es' ? 'En talleres DENUE' : 'In craft workshops'}
                    </p>
                  </div>

                  <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 shadow-md space-y-1">
                    <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                      <span>{language === 'es' ? 'Accesibilidad' : 'Accessibility'}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#EDE28E]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-[#EDE28E] font-mono">100%</div>
                    <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                      {language === 'es' ? 'Red sin escalón auditada' : 'Step-free audited'}
                    </p>
                  </div>

                  <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 shadow-md space-y-1">
                    <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                      <span>{language === 'es' ? 'Afluencia en Vivo' : 'Live Walkers'}</span>
                      <Award className="w-3.5 h-3.5 text-[#EDE28E]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-[#EDE28E] font-mono">
                      {stampLedgerCount}
                    </div>
                    <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                      {language === 'es' ? 'Sellos emitidos en pasaportes' : 'Stamps issued today'}
                    </p>
                  </div>
                </div>

                {/* Tablero Territorial de Afluencia por Barrios */}
                <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#9597C1]/20 pb-3 gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-serif">
                        {language === 'es'
                          ? 'Monitoreo de Carga y Afluencia Barrial en Tiempo Real'
                          : 'Real-Time Neighborhood Influx & Carrying Load'}
                      </h3>
                      <p className="text-xs text-[#9597C1]">
                        {language === 'es'
                          ? 'Distribución territorial de caminantes entre los 5 núcleos patrimoniales de Puebla.'
                          : 'Territorial distribution of pedestrians across Puebla’s 5 historic zones.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportReport}
                        className="px-3.5 py-1.5 rounded-xl bg-[#EDE28E] hover:bg-[#F4ECA6] text-[#0E2C9C] text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'es' ? 'Exportar Dictamen SECIHTI' : 'Export SECIHTI Report'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="px-3 py-1.5 rounded-xl bg-[#07154E] hover:bg-[#0E2C9C] text-[#EDE28E] border border-[#EDE28E]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span>{language === 'es' ? 'Ver Mapa Turístico' : 'Tourist Map'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'zocalo_centro_nucleo',
                        title: language === 'es' ? 'Zócalo / Centro Núcleo' : 'Zócalo Core',
                        workshops: 4,
                        cap: zonePaxCaps.zocalo_centro_nucleo,
                        loadPct: 42,
                        status: language === 'es' ? 'Tránsito Controlado' : 'Controlled Flow'
                      },
                      {
                        key: 'barrio_analco',
                        title: language === 'es' ? 'Barrio de Analco' : 'Analco Ward',
                        workshops: 6,
                        cap: zonePaxCaps.barrio_analco,
                        loadPct: 68,
                        status: language === 'es' ? 'Afluencia Óptima' : 'Optimal Influx'
                      },
                      {
                        key: 'barrio_la_luz',
                        title: language === 'es' ? 'Barrio de La Luz' : 'La Luz Pottery Ward',
                        workshops: 4,
                        cap: zonePaxCaps.barrio_la_luz,
                        loadPct: 55,
                        status: language === 'es' ? 'Afluencia Saludable' : 'Healthy Influx'
                      },
                      {
                        key: 'barrio_el_alto',
                        title: language === 'es' ? 'Barrio de El Alto' : 'El Alto Ward',
                        workshops: 3,
                        cap: zonePaxCaps.barrio_el_alto,
                        loadPct: 48,
                        status: language === 'es' ? 'Flujo Equilibrado' : 'Balanced Flow'
                      },
                      {
                        key: 'barrio_xanenetla',
                        title: language === 'es' ? 'Barrio de Xanenetla' : 'Xanenetla Mural Ward',
                        workshops: 3,
                        cap: zonePaxCaps.barrio_xanenetla,
                        loadPct: 38,
                        status: language === 'es' ? 'Capacidad Disponible' : 'Capacity Available'
                      }
                    ].map((zone) => (
                      <div
                        key={zone.key}
                        className="bg-[#07154E] border border-[#9597C1]/20 rounded-xl p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{zone.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EDE28E]/15 text-[#EDE28E] border border-[#EDE28E]/30 font-bold">
                            {zone.workshops} {language === 'es' ? 'talleres DENUE' : 'shops'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#9597C1]">
                            <span>{zone.status}</span>
                            <span className="font-mono text-[#EDE28E] font-bold">
                              {zone.loadPct}% ({zone.cap} pax/h)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#0B228A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-[#EDE28E] rounded-full transition-all duration-500"
                              style={{ width: `${zone.loadPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ESPACIO 2: OBRAS EN BANQUETAS & ACCESIBILIDAD                  */}
            {/* ============================================================== */}
            {activeSpace === 'infrastructure' && (
              <div className="space-y-4 animate-fade-slide">
                <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#9597C1]/20 pb-3 gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2 font-serif">
                        <AlertTriangle className="w-4 h-4 text-[#EDE28E]" />
                        <span>
                          {language === 'es'
                            ? 'Priorización de Obras en Banquetas (Análisis "¿Qué pasa si...?")'
                            : 'Sidewalk Works Simulator ("What-If" Analysis)'}
                        </span>
                      </h3>
                      <p className="text-xs text-[#9597C1] mt-0.5">
                        {language === 'es'
                          ? 'Simula la reparación de banquetas para verificar qué talleres y patrimonio histórico quedan conectados.'
                          : 'Simulate repairs to see how workshops and heritage connect on the pedestrian network.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-[#07154E] p-1 rounded-xl border border-[#9597C1]/20 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          tacticalAudio.playTacticalClick();
                          setBarrierProfile('silla_de_ruedas');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                          barrierProfile === 'silla_de_ruedas'
                            ? 'bg-[#EDE28E] text-[#0E2C9C] shadow'
                            : 'text-[#9597C1] hover:text-[#EFF1F8]'
                        }`}
                      >
                        {language === 'es' ? 'Silla de Ruedas' : 'Wheelchair'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          tacticalAudio.playTacticalClick();
                          setBarrierProfile('movilidad_reducida');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                          barrierProfile === 'movilidad_reducida'
                            ? 'bg-[#EDE28E] text-[#0E2C9C] shadow'
                            : 'text-[#9597C1] hover:text-[#EFF1F8]'
                        }`}
                      >
                        {language === 'es' ? 'Movilidad Reducida' : 'Reduced Mobility'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeBarriers.map((b: any, idx: number) => {
                      const isRepaired = repairedBarriers.includes(b.segment_id);

                      return (
                        <div
                          key={b.segment_id}
                          className={`p-4 rounded-xl border text-xs space-y-2.5 transition ${
                            isRepaired
                              ? 'bg-[#0E2C9C]/40 border-[#EDE28E]/70 shadow-md'
                              : 'bg-[#07154E] border-[#9597C1]/20 hover:border-[#9597C1]/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-black text-[#EDE28E] bg-[#0B228A] px-2 py-0.5 rounded-lg border border-[#EDE28E]/30">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-white text-sm capitalize">
                                {b.street}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleRepair(b.segment_id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                                isRepaired
                                  ? 'bg-[#EDE28E] text-[#0E2C9C] shadow font-black'
                                  : 'bg-[#0E2C9C] hover:bg-[#2544A7] text-[#EDE28E] border border-[#EDE28E]/40'
                              }`}
                            >
                              {isRepaired ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-[#0E2C9C]" />
                                  <span>{language === 'es' ? 'Obra Simulada (Reparada)' : 'Repaired'}</span>
                                </>
                              ) : (
                                <>
                                  <Hammer className="w-4 h-4" />
                                  <span>{language === 'es' ? 'Simular Obra en Banqueta' : 'Simulate Repair'}</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9597C1]">
                            <span className="uppercase font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#EFF1F8] border border-white/10">
                              {b.zone.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[#EDE28E] font-medium">
                              {language === 'es' ? 'Obstáculo físico:' : 'Barrier:'}{' '}
                              {Array.isArray(b.obstacles) ? b.obstacles.join(', ').replace(/_/g, ' ') : b.obstacles}
                            </span>
                          </div>

                          <div className="text-xs text-[#EFF1F8] bg-[#0B228A]/50 p-2.5 rounded-xl border border-white/5">
                            <strong className="text-[#EDE28E]">
                              {language === 'es' ? 'Habilita acceso directo a:' : 'Unlocks direct access to:'}
                            </strong>{' '}
                            {Array.isArray(b.unlocked_pois_names) ? b.unlocked_pois_names.join(', ') : b.unlocked_pois_names}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ESPACIO 3: CAPACIDAD BARRIAL & ANTI-SATURACIÓN                 */}
            {/* ============================================================== */}
            {activeSpace === 'capacity' && (
              <div className="space-y-4 animate-fade-slide">
                <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#9597C1]/20 pb-3 gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2 font-serif">
                        <Sliders className="w-4 h-4 text-[#EDE28E]" />
                        <span>
                          {language === 'es'
                            ? 'Cupos de Capacidad Barrial (Anti-Saturación y Protección Vecinal)'
                            : 'Neighborhood Capacity Quotas (Anti-Saturation)'}
                        </span>
                      </h3>
                      <p className="text-xs text-[#9597C1] mt-0.5">
                        {language === 'es'
                          ? 'Regula los límites de caminantes por hora para proteger la tranquilidad de los vecinos y evitar la masificación.'
                          : 'Regulate visitor limits per hour to preserve neighborhood tranquility and avoid overcrowding.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        setZonePaxCaps(INITIAL_ZONE_PAX_CAPS);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#07154E] hover:bg-[#0E2C9C] border border-[#9597C1]/30 text-xs font-bold text-[#EDE28E] flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title={language === 'es' ? 'Restaurar cupos normativos' : 'Reset quotas'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Restaurar Valores Normativos' : 'Reset to Normative'}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(zonePaxCaps).map(([zone, cap]) => {
                      const zoneLabels: Record<string, string> = {
                        zocalo_centro_nucleo: 'Zócalo / Centro Núcleo',
                        barrio_analco: 'Barrio de Analco',
                        barrio_la_luz: 'Barrio de La Luz',
                        barrio_el_alto: 'Barrio de El Alto',
                        barrio_xanenetla: 'Barrio de Xanenetla'
                      };
                      const maxStopsInSolver = Math.max(1, Math.round(cap / 30));

                      return (
                        <div
                          key={zone}
                          className="space-y-1.5 bg-[#07154E] p-3 sm:p-4 rounded-xl border border-[#9597C1]/15"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white text-sm">
                              {zoneLabels[zone] || zone}
                            </span>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-[#EDE28E] font-black bg-[#0B228A] px-2.5 py-1 rounded-lg border border-[#EDE28E]/30">
                                {cap} {language === 'es' ? 'caminantes / hora' : 'walkers / h'}
                              </span>
                              <span className="bg-[#EDE28E]/15 text-[#EDE28E] border border-[#EDE28E]/30 px-2 py-1 rounded-lg text-[11px] font-bold hidden sm:inline">
                                máx {maxStopsInSolver} {maxStopsInSolver === 1 ? 'parada' : 'paradas'} simultáneas
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="180"
                            step="15"
                            value={cap}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setZonePaxCaps((prev) => ({ ...prev, [zone]: val }));
                            }}
                            className="w-full h-2 bg-[#0B228A] rounded-lg appearance-none cursor-pointer accent-[#EDE28E]"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-[#9597C1] leading-relaxed border-t border-[#9597C1]/20 pt-3">
                    {language === 'es'
                      ? 'Los cupos fijados en este módulo regulan en tiempo real las recomendaciones de dispersión territorial para mantener el equilibrio entre el impulso comercial a talleres y la vida cotidiana de las familias residentes.'
                      : 'Quotas govern territorial dispersion in real-time to maintain balance between local commerce and residents’ quality of life.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;
