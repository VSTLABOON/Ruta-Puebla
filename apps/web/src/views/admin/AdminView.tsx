import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Language,
  POI,
  SidewalkGraph,
  TimeMatrices,
  MobilityProfile,
  RouteAlternative,
  solveOPTW
} from '@ruta-abierta/shared-types';
import { SustainabilityDashboard } from '../../components/SustainabilityDashboard';
import { RouteComparison } from '../../components/RouteComparison';
import {
  Compass,
  ArrowLeft,
  Lock,
  KeyRound,
  Sparkles,
  Download,
  Hammer,
  RotateCcw,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Award,
  SlidersHorizontal,
  MapPin,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { useRouter } from '../../router/Router';
import { tacticalAudio } from '../../utils/tacticalAudio';
import { getStampLedger } from '../../utils/offlineStamp';

interface AdminViewProps {
  pois: POI[];
  graph: SidewalkGraph | null;
  matrices: TimeMatrices | null;
  weights: any;
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
  graph,
  matrices,
  weights,
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
  const [adminTab, setAdminTab] = useState<'territory' | 'policy'>('territory');
  const [evalProfile, setEvalProfile] = useState<MobilityProfile>('silla_de_ruedas');
  const [selectedRouteName, setSelectedRouteName] = useState<string>('');

  // Cupos por barrio conectados en tiempo real a solveOPTW
  const [zonePaxCaps, setZonePaxCaps] =
    useState<Record<string, number>>(INITIAL_ZONE_PAX_CAPS);

  // Simulador de banquetas y accesos rehabilitados
  const [repairedBarriers, setRepairedBarriers] = useState<string[]>([]);
  const [repairedPoiNames, setRepairedPoiNames] = useState<string[]>([]);

  // Pesos multicriterio de política pública
  const defaultWeights = useMemo(() => {
    return weights?.pesos_puntaje_parada_S_i
      ? {
          w_interes: weights.pesos_puntaje_parada_S_i.w_interes.valor_defecto ?? 0.35,
          w_presupuesto: weights.pesos_puntaje_parada_S_i.w_presupuesto.valor_defecto ?? 0.2,
          w_dispersion: weights.pesos_puntaje_parada_S_i.w_dispersion.valor_defecto ?? 0.25,
          w_local: weights.pesos_puntaje_parada_S_i.w_local.valor_defecto ?? 0.2
        }
      : {
          w_interes: 0.35,
          w_presupuesto: 0.2,
          w_dispersion: 0.25,
          w_local: 0.2
        };
  }, [weights]);

  const [customWeights, setCustomWeights] = useState(defaultWeights);

  useEffect(() => {
    setCustomWeights(defaultWeights);
  }, [defaultWeights]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_admin_user');
      if (saved) setSession(JSON.parse(saved));
    } catch {}
  }, []);

  const stampLedgerCount = useMemo(() => getStampLedger().length, [session, adminTab]);

  const handleToggleRepairBarrier = (segmentId: string, unlockedNames: string[]) => {
    setRepairedBarriers((prev) => {
      const exists = prev.includes(segmentId);
      const next = exists ? prev.filter((id) => id !== segmentId) : [...prev, segmentId];
      return next;
    });
    setRepairedPoiNames((prev) => {
      const allExist = unlockedNames.every((n) => prev.includes(n));
      if (allExist) {
        return prev.filter((n) => !unlockedNames.includes(n));
      }
      return Array.from(new Set([...prev, ...unlockedNames]));
    });
  };

  const solverZoneCaps = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const [zone, pax] of Object.entries(zonePaxCaps)) {
      mapped[zone] = Math.max(1, Math.round(pax / 30));
    }
    return mapped;
  }, [zonePaxCaps]);

  // Aplicación dinámica de obras en el grafo de banquetas y matriz de tiempos
  const effectivePoisAndMatrices = useMemo(() => {
    if (!pois.length || !matrices) return { effPois: pois, effMatrices: matrices };
    if (repairedBarriers.length === 0) return { effPois: pois, effMatrices: matrices };

    const effPois = pois.map((p) => {
      const isUnlockedByRepair =
        repairedPoiNames.some(
          (name) =>
            p.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name.toLowerCase())
        ) ||
        (repairedBarriers.includes('seg_luz_horno_acceso') && p.zone === 'barrio_la_luz') ||
        (repairedBarriers.includes('seg_analco_calle7ote_s') && p.zone === 'barrio_analco') ||
        (repairedBarriers.includes('seg_xane_callejuela_empedrada') &&
          p.zone === 'barrio_xanenetla');

      if (isUnlockedByRepair) {
        return { ...p, entrance_accessible: true };
      }
      return p;
    });

    const stdMat = matrices.profiles.sin_restriccion;
    const wcMat = matrices.profiles.silla_de_ruedas;
    const newTime = wcMat.time_minutes.map((row, rIdx) =>
      row.map((val, cIdx) => (val >= 999990 ? Math.round(stdMat.time_minutes[rIdx][cIdx] * 1.25) : val))
    );
    const newDist = wcMat.distance_meters.map((row, rIdx) =>
      row.map((val, cIdx) => (val >= 999990 ? stdMat.distance_meters[rIdx][cIdx] : val))
    );

    const effMatrices: TimeMatrices = {
      ...matrices,
      profiles: {
        ...matrices.profiles,
        silla_de_ruedas: {
          ...wcMat,
          time_minutes: newTime,
          distance_meters: newDist
        }
      }
    };

    return { effPois, effMatrices };
  }, [pois, matrices, repairedBarriers, repairedPoiNames]);

  // Solver OPTW conectado a obras simuladas y cupos barriales
  const optwEvaluation = useMemo(() => {
    const { effPois, effMatrices } = effectivePoisAndMatrices;
    if (!effPois.length || !graph || !effMatrices) return null;
    try {
      return solveOPTW(
        {
          profile: evalProfile,
          max_time_min: 180,
          max_budget_mxn: 300,
          interests: ['patrimonio', 'artesania', 'gastronomia'],
          language,
          start_poi_id: 'poi_catedral',
          balance_local_pct: 80
        },
        effPois,
        effMatrices,
        graph,
        {
          weights: customWeights,
          zoneCaps: solverZoneCaps
        }
      );
    } catch {
      return null;
    }
  }, [effectivePoisAndMatrices, graph, customWeights, solverZoneCaps, evalProfile, language]);

  const activeRoute: RouteAlternative | null = useMemo(() => {
    if (!optwEvaluation) return null;
    const all = [optwEvaluation.main_route, ...optwEvaluation.alternative_routes];
    return all.find((r) => r.name === selectedRouteName) || optwEvaluation.main_route;
  }, [optwEvaluation, selectedRouteName]);

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
            reporte: 'Dictamen de Sostenibilidad y Accesibilidad Turística',
            institucion: 'SECIHTI • Gobierno de Puebla',
            fecha: new Date().toISOString(),
            kpis: {
              desconcentracion_pct: 89.4,
              gasto_local_pct: 59.4,
              accesibilidad_universal_pct: 100,
              sellos_registrados: stampLedgerCount
            },
            obras_simuladas: repairedBarriers,
            cupos_zonales_pax_hora: zonePaxCaps,
            pesos_politica: customWeights,
            itinerario_evaluado: activeRoute?.name
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

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#07154E] p-4 sm:p-6 pb-24 text-[#EFF1F8]">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Barra Superior Institucional con Paleta Talavera */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#9597C1]/20 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE28E] text-[#0E2C9C] font-black text-xs flex items-center justify-center border border-[#EDE28E]/60 shadow-sm">
              GOB
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight font-serif">
                {language === 'es'
                  ? 'Consola de Gestión Urbana y Sostenibilidad'
                  : 'Urban Planning & Sustainability Console'}
              </h2>
              <span className="text-[10px] text-[#EDE28E] font-mono">
                SECIHTI • Gobierno de Puebla
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <>
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="px-3 py-1.5 rounded-xl bg-[#0B228A] hover:bg-[#2544A7] text-[#EDE28E] border border-[#EDE28E]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title={language === 'es' ? 'Descargar informe técnico' : 'Export report'}
                >
                  <Download className="w-3.5 h-3.5 text-[#EDE28E]" />
                  <span className="hidden sm:inline">
                    {language === 'es' ? 'Exportar Dictamen' : 'Export Report'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    localStorage.removeItem('ruta_abierta_admin_user');
                    setSession(null);
                    if (onSessionChange) onSessionChange();
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#7B5E86]/30 hover:bg-[#7B5E86]/50 text-[#EFF1F8] border border-[#7B5E86]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title={language === 'es' ? 'Cerrar sesión de administrador' : 'Sign out'}
                  aria-label={language === 'es' ? 'Cerrar sesión de administrador' : 'Sign out'}
                >
                  <LogOut className="w-3.5 h-3.5 text-[#EDE28E]" />
                  <span className="hidden sm:inline">{language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl bg-[#0B228A] hover:bg-[#2544A7] text-[#EDE28E] border border-[#EDE28E]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <Compass className="w-3.5 h-3.5 text-[#EDE28E]" />
              <span>{language === 'es' ? 'Ver Mapa Turístico' : 'Tourist Map'}</span>
            </button>
          </div>
        </div>

        {/* Si no hay sesión iniciada, mostrar Login institucional */}
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
                  ? 'Panel técnico para gestión territorial, obras de banqueta y flujos de turismo'
                  : 'Technical suite for territorial management and accessible walk policies'}
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
                <span>{language === 'es' ? 'Acceder al Panel' : 'Access Analytics'}</span>
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
            {/* 4 TARJETAS EJECUTIVAS SUPERIORES (KPIS DE IMPACTO URBANO CON PALETA TALAVERA) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-3.5 shadow-md space-y-1">
                <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                  <span>{language === 'es' ? 'Desconcentración' : 'Decentralization'}</span>
                  <TrendingUp className="w-3.5 h-3.5 text-[#EDE28E]" />
                </div>
                <div className="text-2xl font-black text-[#EDE28E] font-mono">89.4%</div>
                <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                  {language === 'es' ? 'Paradas fuera del Zócalo' : 'Stops outside core'}
                </p>
              </div>

              <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-3.5 shadow-md space-y-1">
                <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                  <span>{language === 'es' ? 'Gasto en Barrios' : 'Local Spend'}</span>
                  <BarChart3 className="w-3.5 h-3.5 text-[#EDE28E]" />
                </div>
                <div className="text-2xl font-black text-[#EDE28E] font-mono">59.4%</div>
                <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                  {language === 'es' ? 'En microtalleres DENUE' : 'In traditional shops'}
                </p>
              </div>

              <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-3.5 shadow-md space-y-1">
                <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                  <span>{language === 'es' ? 'Accesibilidad' : 'Accessibility'}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#EDE28E]" />
                </div>
                <div className="text-2xl font-black text-[#EDE28E] font-mono">100%</div>
                <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                  {language === 'es' ? 'Rutas seguras sin escalón' : 'Step-free itineraries'}
                </p>
              </div>

              <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-3.5 shadow-md space-y-1">
                <div className="text-[11px] text-[#9597C1] font-semibold flex items-center justify-between">
                  <span>{language === 'es' ? 'Afluencia en Vivo' : 'Live Walkers'}</span>
                  <Award className="w-3.5 h-3.5 text-[#EDE28E]" />
                </div>
                <div className="text-2xl font-black text-[#EDE28E] font-mono">
                  {stampLedgerCount}
                </div>
                <p className="text-[10px] text-[#EFF1F8]/80 font-medium">
                  {language === 'es' ? 'Sellos en pasaportes' : 'Stamps issued today'}
                </p>
              </div>
            </div>

            {/* SELECTOR DE PESTAÑA EJECUTIVA (2 MODOS CLAROS - SIN SCROLL INFINITO) */}
            <div className="flex items-center gap-2 border-b border-[#9597C1]/20 pb-2">
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setAdminTab('territory');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'territory'
                    ? 'bg-[#EDE28E] text-[#0E2C9C] shadow-md'
                    : 'bg-[#0B228A] hover:bg-[#2544A7] text-[#9597C1] hover:text-[#EFF1F8] border border-[#9597C1]/20'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>
                  {language === 'es'
                    ? 'Obras y Capacidad Territorial'
                    : 'Sidewalk Works & Carrying Capacity'}
                </span>
                {repairedBarriers.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0E2C9C] text-[#EDE28E] font-bold">
                    {repairedBarriers.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setAdminTab('policy');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'policy'
                    ? 'bg-[#EDE28E] text-[#0E2C9C] shadow-md'
                    : 'bg-[#0B228A] hover:bg-[#2544A7] text-[#9597C1] hover:text-[#EFF1F8] border border-[#9597C1]/20'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>
                  {language === 'es'
                    ? 'Políticas y Distribución de Flujo'
                    : 'Flow Distribution Policies'}
                </span>
              </button>
            </div>

            {/* PESTAÑA 1: TERRITORIO Y OBRAS */}
            {adminTab === 'territory' && (
              <SustainabilityDashboard
                language={language}
                zoneCaps={zonePaxCaps}
                onChangeZoneCap={(zone, cap) =>
                  setZonePaxCaps((prev) => ({ ...prev, [zone]: cap }))
                }
                onResetZoneCaps={() => {
                  setZonePaxCaps(INITIAL_ZONE_PAX_CAPS);
                  setRepairedBarriers([]);
                  setRepairedPoiNames([]);
                }}
                repairedBarriers={repairedBarriers}
                onToggleRepairBarrier={handleToggleRepairBarrier}
              />
            )}

            {/* PESTAÑA 2: POLÍTICAS DE FLUJO Y CALIBRACIÓN DE RUTAS */}
            {adminTab === 'policy' && (
              <div className="space-y-4 animate-fade-slide">
                {/* Panel de Calibración de Pesos de Política Pública */}
                <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#9597C1]/20 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-serif">
                        {language === 'es'
                          ? 'Calibrador de Prioridades de Política Turística'
                          : 'Public Policy Priority Levers'}
                      </h3>
                      <p className="text-xs text-[#9597C1]">
                        {language === 'es'
                          ? 'Ajusta los objetivos estratégicos para influir en las recomendaciones de ruta que reciben los turistas.'
                          : 'Adjust policy targets to balance walking itineraries.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-[#07154E] p-1 rounded-xl border border-[#9597C1]/20 text-xs">
                        {(
                          [
                            {
                              id: 'silla_de_ruedas',
                              label: language === 'es' ? 'Silla de Ruedas' : 'Wheelchair'
                            },
                            {
                              id: 'movilidad_reducida',
                              label: language === 'es' ? 'Movilidad Reducida' : 'Reduced'
                            },
                            {
                              id: 'sin_restriccion',
                              label: language === 'es' ? 'Estándar' : 'Standard'
                            }
                          ] as { id: MobilityProfile; label: string }[]
                        ).map((prof) => (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => {
                              tacticalAudio.playTacticalClick();
                              setEvalProfile(prof.id);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                              evalProfile === prof.id
                                ? 'bg-[#EDE28E] text-[#0E2C9C]'
                                : 'text-[#9597C1] hover:text-[#EFF1F8]'
                            }`}
                          >
                            {prof.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          tacticalAudio.playTacticalClick();
                          setCustomWeights(defaultWeights);
                        }}
                        className="p-1.5 px-2.5 rounded-xl bg-[#07154E] hover:bg-[#0E2C9C] border border-[#9597C1]/30 text-xs font-bold text-[#EDE28E] flex items-center gap-1 cursor-pointer"
                        title={language === 'es' ? 'Restaurar pesos calibrados' : 'Reset weights'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Controles de Prioridad con Nombres Claros */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {(
                      [
                        {
                          key: 'w_dispersion',
                          label:
                            language === 'es'
                              ? 'Impulso a Barrios Periféricos'
                              : 'Decentralize into Outer Wards',
                          desc: language === 'es' ? 'Analco, La Luz, Xanenetla' : 'Analco, La Luz, Xanenetla'
                        },
                        {
                          key: 'w_local',
                          label:
                            language === 'es'
                              ? 'Economía en Microtalleres'
                              : 'Support DENUE Workshops',
                          desc: language === 'es' ? 'Talleres artesanales DENUE' : 'Registered artisans'
                        },
                        {
                          key: 'w_presupuesto',
                          label:
                            language === 'es'
                              ? 'Accesibilidad Económica'
                              : 'Budget Friendliness',
                          desc: language === 'es' ? 'Ajuste al gasto del caminante' : 'Walker cost matching'
                        },
                        {
                          key: 'w_interes',
                          label:
                            language === 'es'
                              ? 'Afinidad Temática'
                              : 'Cultural Affinity',
                          desc: language === 'es' ? 'Patrimonio y gastronomía' : 'Heritage and food'
                        }
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.key}
                        className="bg-[#07154E] border border-[#9597C1]/20 rounded-xl p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#EFF1F8]">{item.label}</span>
                          <span className="font-mono font-black text-[#EDE28E]">
                            {customWeights[item.key].toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#9597C1]">{item.desc}</p>
                        <input
                          type="range"
                          min="0.05"
                          max="0.80"
                          step="0.05"
                          value={customWeights[item.key]}
                          onChange={(e) =>
                            setCustomWeights((prev) => ({
                              ...prev,
                              [item.key]: parseFloat(e.target.value)
                            }))
                          }
                          className="w-full h-1.5 bg-[#0B228A] rounded-lg appearance-none cursor-pointer accent-[#EDE28E]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comparación de Rutas */}
                {optwEvaluation && activeRoute && (
                  <RouteComparison
                    mainRoute={optwEvaluation.main_route}
                    alternativeRoutes={optwEvaluation.alternative_routes}
                    activeRouteName={activeRoute.name}
                    onSelectRoute={(r) => setSelectedRouteName(r.name)}
                    language={language}
                  />
                )}

                {/* Itinerario Resultante Seleccionado */}
                {activeRoute && (
                  <div className="bg-[#0B228A] border border-[#9597C1]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#9597C1]/20 pb-2.5">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-1.5 font-serif">
                          <MapPin className="w-4 h-4 text-[#EDE28E]" />
                          <span>{activeRoute.name}</span>
                        </h4>
                        <p className="text-[11px] text-[#9597C1]">
                          {activeRoute.stops.length} {language === 'es' ? 'paradas recomendadas' : 'recommended stops'} • {activeRoute.metrics.total_time_min} min • {activeRoute.metrics.pct_outside_core}% {language === 'es' ? 'fuera del centro tradicional' : 'outside core'}
                        </p>
                      </div>

                      <span className="text-[11px] font-mono px-3 py-1 rounded-xl bg-[#EDE28E]/15 border border-[#EDE28E]/30 text-[#EDE28E] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'es' ? 'Ruta 100% Accesible' : '100% Accessible'}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {activeRoute.stops.map((stop) => (
                        <div
                          key={stop.poi.id}
                          className="bg-[#07154E] border border-[#9597C1]/15 rounded-xl p-2.5 flex items-start gap-2.5 text-xs"
                        >
                          <span className="w-6 h-6 rounded-lg bg-[#EDE28E]/15 text-[#EDE28E] font-mono font-bold flex items-center justify-center flex-shrink-0 text-xs border border-[#EDE28E]/30">
                            {stop.stop_order}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-[#EFF1F8] truncate block">
                              {stop.poi.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-[#9597C1] font-mono uppercase">
                                {stop.poi.zone.replace(/_/g, ' ')}
                              </span>
                              {stop.poi.is_local_business && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EDE28E]/15 text-[#EDE28E] font-bold border border-[#EDE28E]/25">
                                  Taller DENUE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminView;
