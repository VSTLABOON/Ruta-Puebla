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
  Sliders
} from 'lucide-react';
import { useRouter } from '../../router/Router';
import { tacticalAudio } from '../../utils/tacticalAudio';

interface AdminViewProps {
  pois: POI[];
  graph: SidewalkGraph | null;
  matrices: TimeMatrices | null;
  weights: any;
  language: Language;
}

export const AdminView: FC<AdminViewProps> = ({
  pois,
  graph,
  matrices,
  weights,
  language
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
  const [evalProfile, setEvalProfile] = useState<MobilityProfile>('silla_de_ruedas');
  const [selectedRouteName, setSelectedRouteName] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_admin_user');
      if (saved) setSession(JSON.parse(saved));
    } catch {}
  }, []);

  const optWeights = useMemo(() => {
    return weights
      ? {
          w_interes: weights.pesos_puntaje_parada_S_i.w_interes.valor_defecto,
          w_presupuesto: weights.pesos_puntaje_parada_S_i.w_presupuesto.valor_defecto,
          w_dispersion: weights.pesos_puntaje_parada_S_i.w_dispersion.valor_defecto,
          w_local: weights.pesos_puntaje_parada_S_i.w_local.valor_defecto
        }
      : undefined;
  }, [weights]);

  // Evaluación multicriterio OPTW en vivo para auditores SECIHTI
  const optwEvaluation = useMemo(() => {
    if (!pois.length || !graph || !matrices) return null;
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
        pois,
        matrices,
        graph,
        { weights: optWeights }
      );
    } catch {
      return null;
    }
  }, [pois, graph, matrices, optWeights, evalProfile, language]);

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
      setErrorMsg(language === 'es' ? 'Ingresa la clave institucional' : 'Enter institutional key');
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
  };

  const handleLogout = () => {
    tacticalAudio.playTacticalClick();
    localStorage.removeItem('ruta_abierta_admin_user');
    setSession(null);
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
                {language === 'es' ? 'Panel SECIHTI • Analítica Urbana y Sostenibilidad' : 'SECIHTI Urban Analytics & Planning'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Simulación de 150 agentes sintéticos, dispersión de flujo y priorización de banquetas'
                  : '150 synthetic agent simulation, crowd dispersion, and sidewalk works ranking'}
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
                <span className="hidden sm:inline">{language === 'es' ? 'Cerrar Sesión' : 'Logout'}</span>
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
                  {language === 'es' ? 'Clave de Acceso Institucional:' : 'Institutional Access Key:'}
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
          <div className="space-y-6">
            {/* Banner de Administrador Activo */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                    {language === 'es' ? 'Sesión de Planificador Autenticada:' : 'Authenticated Planner Session:'}
                  </span>
                  <span className="font-extrabold text-sm text-white">
                    {session.institution}
                  </span>
                  <span className="text-xs text-slate-300 ml-2">
                    ({session.user})
                  </span>
                </div>
              </div>
            </div>

            {/* Dashboard de Sostenibilidad SECIHTI */}
            <SustainabilityDashboard language={language} />

            {/* Auditoría Algorítmica OPTW y Explicabilidad Multicriterio (S_i) */}
            {optwEvaluation && activeRoute && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {language === 'es'
                          ? 'Auditoría Algorítmica OPTW y Explicabilidad Multicriterio (S_i)'
                          : 'OPTW Algorithmic Audit & Multicriteria Explainability (S_i)'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {language === 'es'
                          ? 'Comparativa técnica exclusiva para evaluadores (oculta en la vista del turista para evitar fricción visual)'
                          : 'Technical benchmark exclusively for evaluators (hidden from tourist view for clean UX)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <Sliders className="w-3.5 h-3.5 text-slate-400 ml-2" />
                    {(
                      [
                        { id: 'silla_de_ruedas', label: language === 'es' ? 'Silla de Ruedas' : 'Wheelchair' },
                        { id: 'movilidad_reducida', label: language === 'es' ? 'Movilidad Reducida' : 'Reduced Mobility' },
                        { id: 'sin_restriccion', label: language === 'es' ? 'Estándar' : 'Standard' }
                      ] as { id: MobilityProfile; label: string }[]
                    ).map((prof) => (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => setEvalProfile(prof.id)}
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
                </div>

                <RouteComparison
                  mainRoute={optwEvaluation.main_route}
                  alternativeRoutes={optwEvaluation.alternative_routes}
                  activeRouteName={activeRoute.name}
                  onSelectRoute={(r) => setSelectedRouteName(r.name)}
                  language={language}
                />

                {/* Desglose Matemático S_i por Parada */}
                <div className="bg-white text-slate-900 rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                        {language === 'es'
                          ? `Desglose de Utilidad Matemática S_i — ${activeRoute.name}`
                          : `Mathematical Utility Breakdown S_i — ${activeRoute.name}`}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        S_i = w_interes · Sim_i + w_presupuesto · Presup_i + w_dispersion · Disp_i + w_local · Local_i
                      </p>
                    </div>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                      Utilidad Acumulada: {totalUtilityScore} pts
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">{language === 'es' ? 'Parada (POI)' : 'Stop (POI)'}</th>
                          <th className="p-2 text-right">+Afinidad Cultural</th>
                          <th className="p-2 text-right">+Ajuste Presupuestal</th>
                          <th className="p-2 text-right">+Dispersión Barrial</th>
                          <th className="p-2 text-right">+Economía Local</th>
                          <th className="p-2 text-right">S_i Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {activeRoute.stops.map((stop) => (
                          <tr key={stop.poi.id} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{stop.stop_order}</td>
                            <td className="p-2 font-semibold text-slate-900">
                              {stop.poi.name}
                              <span className="block text-[10px] text-slate-500 font-normal">
                                {stop.poi.zone.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-right text-sky-700 font-semibold">
                              +{stop.score_breakdown.interest_similarity.toFixed(2)}
                            </td>
                            <td className="p-2 font-mono text-right text-emerald-700 font-semibold">
                              +{stop.score_breakdown.budget_fit.toFixed(2)}
                            </td>
                            <td className="p-2 font-mono text-right text-indigo-700 font-semibold">
                              +{stop.score_breakdown.dispersion_bonus.toFixed(2)}
                            </td>
                            <td className="p-2 font-mono text-right text-amber-800 font-semibold">
                              +{stop.score_breakdown.local_business_bonus.toFixed(2)}
                            </td>
                            <td className="p-2 font-mono text-right font-extrabold text-slate-900 bg-amber-50/60">
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
