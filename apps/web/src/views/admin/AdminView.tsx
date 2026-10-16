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
  BarChart3,
  Compass,
  ArrowLeft,
  Lock,
  KeyRound,
  Sparkles,
  ShieldCheck,
  LogOut,
  Cpu,
  Sliders,
  RotateCcw,
  Award,
  Hammer,
  Layers
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
  const [adminTab, setAdminTab] = useState<'all' | 'territory' | 'algorithm'>('all');
  const [evalProfile, setEvalProfile] = useState<MobilityProfile>('silla_de_ruedas');
  const [selectedRouteName, setSelectedRouteName] = useState<string>('');

  // Cupos por barrio conectados en vivo a solveOPTW
  const [zonePaxCaps, setZonePaxCaps] =
    useState<Record<string, number>>(INITIAL_ZONE_PAX_CAPS);

  // Simulador "¿Qué pasa si reparamos esta banqueta?" (segmentIds y nombres de POIs desbloqueados)
  const [repairedBarriers, setRepairedBarriers] = useState<string[]>([]);
  const [repairedPoiNames, setRepairedPoiNames] = useState<string[]>([]);

  // Pesos multicriterio calibrables en tiempo real por el planificador
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

  // Convertir pax/h en límite máximo de paradas por barrio para solveOPTW
  const solverZoneCaps = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const [zone, pax] of Object.entries(zonePaxCaps)) {
      mapped[zone] = Math.max(1, Math.round(pax / 30));
    }
    return mapped;
  }, [zonePaxCaps]);

  // Aplicar reparaciones simuladas de banquetas/accesos sobre los POIs y matrices
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

    // Si un tramo estaba bloqueado (999999) en silla_de_ruedas, usar tiempos de movilidad_reducida para los POIs rehabilitados
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

  // Evaluación multicriterio OPTW en vivo conectada a cupos barriales, obras simuladas y pesos S_i
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

  const totalUtilityScore = useMemo(() => {
    if (!activeRoute) return 0;
    return Number(
      activeRoute.stops
        .reduce((acc, s) => acc + s.score_breakdown.total_s_i, 0)
        .toFixed(2)
    );
  }, [activeRoute]);

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

  const handleLogout = () => {
    tacticalAudio.playTacticalClick();
    localStorage.removeItem('ruta_abierta_admin_user');
    setSession(null);
    if (onSessionChange) onSessionChange();
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 pb-24 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Barra superior del panel de administración */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {language === 'es'
                  ? 'Consola de Decisiones SECIHTI • Planificación Urbana y Algoritmo OPTW'
                  : 'SECIHTI Decision Console • Urban Planning & OPTW Engine'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Simulador en tiempo real de obra en banquetas, regulación de carga barrial y auditoría matemática S_i'
                  : 'Real-time sidewalk works simulator, neighborhood capacity control, and S_i mathematical audit'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'es' ? 'Cerrar sesión de administrador' : 'Log out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {language === 'es' ? 'Cerrar Sesión' : 'Logout'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <Compass className="w-4 h-4 text-amber-400" />
              <span>{language === 'es' ? 'Volver al Mapa' : 'Back to Map'}</span>
            </button>
          </div>
        </div>

        {/* Si no ha iniciado sesión, mostrar tarjeta de Login */}
        {!session ? (
          <div className="max-w-md mx-auto my-8 bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-slide">
            <div className="text-center space-y-1 pb-3 border-b border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                {language === 'es' ? 'Acceso Planificadores SECIHTI' : 'SECIHTI Planner Access'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Panel técnico reservado para gestión territorial y turismo sostenible'
                  : 'Technical portal for urban planning and public works prioritization'}
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  {language === 'es'
                    ? 'Clave de Acceso Institucional:'
                    : 'Institutional Access Key:'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="SECIHTI-PUEBLA-2026"
                    className="w-full border border-white/15 rounded-xl p-2.5 pl-8 text-xs text-white bg-slate-950 font-mono tracking-wider placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Acceder al Panel' : 'Access Analytics'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === 'es'
                    ? 'Acceso Demostración SECIHTI (1 Clic)'
                    : 'Quick 1-Click SECIHTI Demo'}
                </span>
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Barra de Comando Rápida + Telemetría en Vivo */}
            <div className="bg-slate-900 border border-white/10 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                    {session.institution}
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm text-white">
                    {session.user}
                  </span>
                </div>
              </div>

              {/* Telemetría instantánea del escenario simulado */}
              {activeRoute && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-white/10 text-amber-400 font-bold">
                    {activeRoute.stops.length} paradas ({activeRoute.metrics.pct_outside_core}% fuera Zócalo)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-white/10 text-emerald-400 font-bold">
                    Σ S_i = {totalUtilityScore} pts
                  </span>
                  {repairedBarriers.length > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                      <Hammer className="w-3 h-3" />
                      {repairedBarriers.length} {language === 'es' ? 'obras simuladas' : 'simulated works'}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {stampLedgerCount} {language === 'es' ? 'sellos NFC/QR' : 'NFC/QR stamps'}
                  </span>
                </div>
              )}

              {/* Selector Rápido de Módulo (Sin scroll innecesario) */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setAdminTab('all');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    adminTab === 'all'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Todo' : 'All'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setAdminTab('territory');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    adminTab === 'territory'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Obra y Cupos' : 'Works & Quotas'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setAdminTab('algorithm');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    adminTab === 'algorithm'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Auditoría S_i' : 'S_i Audit'}</span>
                </button>
              </div>
            </div>

            {/* MÓDULO 1: SOSTENIBILIDAD, SIMULADOR DE BARRERAS Y CUPOS ZONALES */}
            {(adminTab === 'all' || adminTab === 'territory') && (
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

            {/* MÓDULO 2: LABORATORIO ALGORÍTMICO OPTW Y EXPLICABILIDAD MULTICRITERIO (S_i) */}
            {(adminTab === 'all' || adminTab === 'algorithm') &&
              optwEvaluation &&
              activeRoute && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <Cpu className="w-5 h-5 text-amber-400" />
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-white">
                            {language === 'es'
                              ? 'Laboratorio Algorítmico OPTW y Calibrador de Pesos de Política Pública'
                              : 'OPTW Algorithmic Lab & Public Policy Weight Calibrator'}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {language === 'es'
                              ? 'Modifica los pesos w_i o el perfil de movilidad para auditar la sensibilidad matemática de la ruta'
                              : 'Adjust policy weights w_i or mobility profile to audit route mathematical sensitivity'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                          <Sliders className="w-3.5 h-3.5 text-slate-400 ml-2" />
                          {(
                            [
                              {
                                id: 'silla_de_ruedas',
                                label: language === 'es' ? 'Silla de Ruedas' : 'Wheelchair'
                              },
                              {
                                id: 'movilidad_reducida',
                                label:
                                  language === 'es' ? 'Movilidad Reducida' : 'Reduced Mobility'
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
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'text-slate-400 hover:text-white'
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
                          className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                          title={language === 'es' ? 'Restaurar pesos calibrados' : 'Reset weights'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset w_i</span>
                        </button>
                      </div>
                    </div>

                    {/* Sliders interactivos para los 4 pesos del modelo de elección discreta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(
                        [
                          {
                            key: 'w_interes',
                            label: language === 'es' ? 'w_interés (Afinidad)' : 'w_interest (Affinity)',
                            color: 'text-sky-400'
                          },
                          {
                            key: 'w_presupuesto',
                            label: language === 'es' ? 'w_presupuesto (Costo)' : 'w_budget (Cost Fit)',
                            color: 'text-emerald-400'
                          },
                          {
                            key: 'w_dispersion',
                            label:
                              language === 'es'
                                ? 'w_dispersión (Fuera Zócalo)'
                                : 'w_dispersion (Decentralization)',
                            color: 'text-indigo-400'
                          },
                          {
                            key: 'w_local',
                            label:
                              language === 'es'
                                ? 'w_local (Talleres DENUE)'
                                : 'w_local (DENUE Workshops)',
                            color: 'text-amber-400'
                          }
                        ] as const
                      ).map((item) => (
                        <div
                          key={item.key}
                          className="bg-slate-950/90 border border-white/10 rounded-xl p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300">{item.label}</span>
                            <span className={`font-mono font-black ${item.color}`}>
                              {customWeights[item.key].toFixed(2)}
                            </span>
                          </div>
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
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <RouteComparison
                    mainRoute={optwEvaluation.main_route}
                    alternativeRoutes={optwEvaluation.alternative_routes}
                    activeRouteName={activeRoute.name}
                    onSelectRoute={(r) => setSelectedRouteName(r.name)}
                    language={language}
                  />

                  {/* Desglose Matemático S_i por Parada (Tema Oscuro Táctico Coherente) */}
                  <div className="bg-slate-900 text-slate-100 rounded-2xl border border-white/10 p-5 shadow-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white">
                          {language === 'es'
                            ? `Desglose de Utilidad Matemática S_i — ${activeRoute.name}`
                            : `Mathematical Utility Breakdown S_i — ${activeRoute.name}`}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          S_i = w_interés·Sim_i + w_presupuesto·Presup_i + w_dispersión·Disp_i + w_local·Local_i
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl font-black">
                        Utilidad Acumulada: {totalUtilityScore} pts
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-white/10 rounded-xl overflow-hidden">
                        <thead className="bg-slate-950 text-slate-300 font-bold border-b border-white/10 text-[11px]">
                          <tr>
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">
                              {language === 'es' ? 'Parada (POI)' : 'Stop (POI)'}
                            </th>
                            <th className="p-2.5 text-right">+Afinidad Cultural</th>
                            <th className="p-2.5 text-right">+Ajuste Presupuestal</th>
                            <th className="p-2.5 text-right">+Dispersión Barrial</th>
                            <th className="p-2.5 text-right">+Economía Local</th>
                            <th className="p-2.5 text-right">S_i Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          {activeRoute.stops.map((stop) => (
                            <tr key={stop.poi.id} className="hover:bg-white/5 transition">
                              <td className="p-2.5 font-mono font-bold text-amber-400">
                                {stop.stop_order}
                              </td>
                              <td className="p-2.5 font-semibold text-white">
                                {stop.poi.name}
                                <span className="block text-[10px] text-slate-400 font-mono uppercase">
                                  {stop.poi.zone.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-right text-sky-400 font-semibold">
                                +{stop.score_breakdown.interest_similarity.toFixed(2)}
                              </td>
                              <td className="p-2.5 font-mono text-right text-emerald-400 font-semibold">
                                +{stop.score_breakdown.budget_fit.toFixed(2)}
                              </td>
                              <td className="p-2.5 font-mono text-right text-indigo-300 font-semibold">
                                +{stop.score_breakdown.dispersion_bonus.toFixed(2)}
                              </td>
                              <td className="p-2.5 font-mono text-right text-amber-300 font-semibold">
                                +{stop.score_breakdown.local_business_bonus.toFixed(2)}
                              </td>
                              <td className="p-2.5 font-mono text-right font-black text-amber-400 bg-amber-500/10">
                                {stop.score_breakdown.total_s_i.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

