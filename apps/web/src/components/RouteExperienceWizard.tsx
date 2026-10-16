import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  POI,
  SidewalkGraph,
  TimeMatrices,
  RouteAlternative,
  RouteRequest,
  MobilityProfile,
  solveOPTW
} from '@ruta-abierta/shared-types';
import {
  Sparkles,
  Clock,
  Coins,
  Compass,
  CheckCircle2,
  X,
  Footprints,
  Accessibility,
  HeartHandshake,
  Flame,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';

interface RouteExperienceWizardProps {
  pois: POI[];
  graph: SidewalkGraph | null;
  matrices: TimeMatrices | null;
  language: 'es' | 'en';
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (route: RouteAlternative) => void;
}

type InterestCategory = 'artisans' | 'heritage' | 'street_art' | 'gastronomy';

export const RouteExperienceWizard: FC<RouteExperienceWizardProps> = ({
  pois,
  graph,
  matrices,
  language,
  isOpen,
  onClose,
  onSelectRoute
}) => {
  const [budget, setBudget] = useState<number>(150);
  const [timeMin, setTimeMin] = useState<number>(90);
  const [interest, setInterest] = useState<InterestCategory>('artisans');
  const [profile, setProfile] = useState<MobilityProfile>('sin_restriccion');

  // Generación inteligente de 3 rutas curadas con "El Por Qué"
  const suggestions = useMemo(() => {
    if (!graph || !matrices || pois.length === 0) return [];

    const baseReq: RouteRequest = {
      profile,
      start_poi_id: pois[0]?.id || 'poi_catedral_puebla',
      interests:
        interest === 'artisans'
          ? ['alfarería', 'talavera', 'artesanías', 'vidrio']
          : interest === 'heritage'
          ? ['historia', 'templo', 'iglesia', 'arquitectura']
          : interest === 'street_art'
          ? ['murales', 'arte', 'callejón', 'galería']
          : ['dulces', 'gastronomía', 'mercado', 'café'],
      max_budget_mxn: budget,
      max_time_min: timeMin,
      balance_local_pct: interest === 'artisans' ? 85 : 55,
      language,
      free_text: ''
    };

    // 1. Ruta Barrial y de Oficios
    const solLocal = solveOPTW(
      { ...baseReq, balance_local_pct: 90 },
      pois,
      matrices,
      graph
    );
    const routeLocal = solLocal.main_route;

    // 2. Ruta Monumental y Patrimonio
    const solHeritage = solveOPTW(
      {
        ...baseReq,
        interests: ['historia', 'templo', 'patrimonio', 'plaza'],
        balance_local_pct: 40
      },
      pois,
      matrices,
      graph
    );
    const routeHeritage = solHeritage.main_route;

    // 3. Ruta Exprés de Callejones y Murales
    const solExpress = solveOPTW(
      {
        ...baseReq,
        max_time_min: Math.min(timeMin, 60),
        interests: ['callejón', 'arte', 'mercado'],
        balance_local_pct: 70
      },
      pois,
      matrices,
      graph
    );
    const routeExpress = solExpress.main_route;

    return [
      {
        id: 'sug_artisans',
        name:
          language === 'es'
            ? 'Ruta Oficios Vivos de Analco y La Luz'
            : 'Living Crafts of Analco & La Luz',
        badge: language === 'es' ? '★ Más Auténtica' : '★ Most Authentic',
        badgeColor: 'border-amber-400/50 bg-amber-500/15 text-amber-300',
        route: routeLocal,
        why:
          language === 'es'
            ? `Se adapta a tus ${timeMin} min y presupuesto de $${budget} MXN. Te lleva directamente a talleres en activo de alfarería y hojalata donde maestros artesanos trabajan en vivo, evitando calles con tráfico pesado y priorizando tramos con sombra.`
            : `Tailored to your ${timeMin} min and $${budget} MXN budget. Takes you directly to active pottery and tinsmith workshops with live demonstrations, avoiding busy vehicular traffic and maximizing shady walkways.`
      },
      {
        id: 'sug_heritage',
        name:
          language === 'es'
            ? 'Ruta Tesoros Virreinales y Plazuelas'
            : 'Viceregal Treasures & Plazas',
        badge: language === 'es' ? 'Historia y Arquitectura' : 'Heritage & History',
        badgeColor: 'border-sky-400/50 bg-sky-500/15 text-sky-300',
        route: routeHeritage,
        why:
          language === 'es'
            ? `Maximiza el valor cultural y arquitectónico a muy bajo costo ($0 - $50 MXN). Conecta los claustros, fuentes barrocas y el Barrio del Artista mediante banquetas amplias con desniveles suaves.`
            : `Maximizes cultural and architectural depth with minimal entry costs ($0 - $50 MXN). Links colonial cloisters, baroque fountains, and the Artists' Quarter via wide sidewalks with gentle slopes.`
      },
      {
        id: 'sug_express',
        name:
          language === 'es'
            ? 'Paseo Exprés de Callejones y Murales'
            : 'Express Alleys & Street Murals Walk',
        badge: language === 'es' ? 'Rápida y Panorámica' : 'Quick & Scenic',
        badgeColor: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
        route: routeExpress,
        why:
          language === 'es'
            ? `Ideal si buscas una caminata fluida y sin prisas de menos de una hora. Disfruta de la plazuela de Los Sapos y los murales comunitarios de Xanenetla sin consumos obligatorios.`
            : `Perfect for a relaxed walking stroll under an hour. Enjoy Los Sapos flea market and Xanenetla neighborhood murals with zero mandatory fees.`
      }
    ];
  }, [graph, matrices, pois, language, budget, timeMin, interest, profile]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-6 duration-300"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white font-serif">
                {language === 'es'
                  ? 'Personaliza tu Recorrido en Puebla'
                  : 'Customize Your Walking Route'}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {language === 'es'
                ? 'Elige tus preferencias y te sugerimos las mejores rutas con la explicación del por qué.'
                : 'Choose your preferences and we suggest curated routes with a clear rationale.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Selectores Rápidos e Intuitivos */}
        <div className="space-y-4">
          {/* Presupuesto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                {language === 'es' ? 'Presupuesto Estimado' : 'Estimated Budget'}
              </span>
              <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                ${budget} MXN
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: language === 'es' ? '$0 (Gratis)' : '$0 (Free)', val: 0 },
                { label: language === 'es' ? '$150 (Moderado)' : '$150 (Modest)', val: 150 },
                { label: language === 'es' ? '$300 (Completo)' : '$300 (Full)', val: 300 }
              ].map((b) => (
                <button
                  key={b.val}
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setBudget(b.val);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                    budget === b.val
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tiempo disponible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                {language === 'es' ? 'Tiempo Disponible' : 'Available Time'}
              </span>
              <span className="font-mono font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/30">
                {timeMin} min
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: language === 'es' ? '45m (Paseo Corto)' : '45m (Quick)', val: 45 },
                { label: language === 'es' ? '90m (Recomendado)' : '90m (Standard)', val: 90 },
                { label: language === 'es' ? '150m (Tarde Libre)' : '150m (Extended)', val: 150 }
              ].map((t) => (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setTimeMin(t.val);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                    timeMin === t.val
                      ? 'bg-sky-500 text-slate-950 shadow-md font-black ring-2 ring-sky-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interés Principal */}
          <div className="space-y-2">
            <span className="font-extrabold text-slate-200 text-xs flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {language === 'es' ? '¿Qué quieres descubrir hoy?' : 'What do you want to experience?'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'artisans' as InterestCategory,
                  icon: Flame,
                  label: language === 'es' ? 'Talleres Vivos' : 'Artisans'
                },
                {
                  id: 'heritage' as InterestCategory,
                  icon: Compass,
                  label: language === 'es' ? 'Patrimonio' : 'Heritage'
                },
                {
                  id: 'street_art' as InterestCategory,
                  icon: Sparkles,
                  label: language === 'es' ? 'Murales y Callejón' : 'Street Art'
                },
                {
                  id: 'gastronomy' as InterestCategory,
                  icon: HeartHandshake,
                  label: language === 'es' ? 'Sabores y Dulces' : 'Flavors'
                }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = interest === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setInterest(item.id);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-2 ring-emerald-300'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accesibilidad y Paso */}
          <div className="space-y-2">
            <span className="font-extrabold text-slate-200 text-xs flex items-center gap-1.5">
              <Accessibility className="w-4 h-4 text-indigo-400" />
              {language === 'es' ? 'Paso y Accesibilidad Peatonal' : 'Mobility & Step'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'sin_restriccion' as MobilityProfile,
                  icon: Footprints,
                  label: language === 'es' ? 'Estándar' : 'Standard'
                },
                {
                  id: 'silla_de_ruedas' as MobilityProfile,
                  icon: Accessibility,
                  label: language === 'es' ? 'Sin Escalones' : 'Accessible'
                },
                {
                  id: 'movilidad_reducida' as MobilityProfile,
                  icon: ShieldCheck,
                  label: language === 'es' ? 'Paso Tranquilo' : 'Gentle Pace'
                }
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = profile === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setProfile(p.id);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-indigo-500 text-white font-black shadow-md ring-2 ring-indigo-300'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Rutas Sugeridas con "El Por Qué" */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {language === 'es' ? 'Rutas Sugeridas para Ti' : 'Suggested Routes for You'}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {suggestions.length} {language === 'es' ? 'opciones calculadas' : 'options ready'}
            </span>
          </div>

          <div className="space-y-3">
            {suggestions.map((sug) => {
              const r = sug.route;
              return (
                <div
                  key={sug.id}
                  className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 hover:border-amber-500/40 transition-all duration-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${sug.badgeColor}`}>
                        {sug.badge}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-white font-serif">
                        {sug.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                      <span className="bg-slate-800/90 px-2 py-0.5 rounded-lg border border-white/10">
                        {r.stops.length} {language === 'es' ? 'paradas' : 'stops'}
                      </span>
                      <span className="bg-slate-800/90 px-2 py-0.5 rounded-lg border border-white/10">
                        {r.metrics.total_time_min}m
                      </span>
                      <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 font-bold">
                        ${r.metrics.total_cost_mxn} MXN
                      </span>
                    </div>
                  </div>

                  {/* EL POR QUÉ (The Why) */}
                  <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3 text-xs text-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>{language === 'es' ? '¿Por qué te sugerimos esta ruta?' : 'Why we suggest this route:'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-5">
                      {sug.why}
                    </p>
                  </div>

                  {/* Lugares incluidos */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                    {r.stops.map((stop) => (
                      <span
                        key={stop.poi.id}
                        className="text-[10px] whitespace-nowrap bg-slate-900 border border-white/10 px-2 py-1 rounded-lg text-slate-300 flex items-center gap-1"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px]">
                          {stop.stop_order}
                        </span>
                        <span className="truncate max-w-[120px]">{stop.poi.name}</span>
                      </span>
                    ))}
                  </div>

                  {/* Botón de Selección */}
                  <button
                    type="button"
                    onClick={() => {
                      tacticalAudio.playStampSuccess();
                      onSelectRoute(r);
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer select-none"
                  >
                    <span>{language === 'es' ? 'Aceptar y Trazar esta Ruta' : 'Accept & Trace this Route'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
