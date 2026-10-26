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

    const solLocal = solveOPTW(
      { ...baseReq, balance_local_pct: 90 },
      pois,
      matrices,
      graph
    );
    const routeLocal = solLocal.main_route;

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
        badge: language === 'es' ? '★ Recomendada' : '★ Recommended',
        badgeColor: 'border-[#B84A2C]/30 bg-[#B84A2C]/10 text-[#B84A2C]',
        route: routeLocal,
        why:
          language === 'es'
            ? `Ajustada a ${timeMin} min y $${budget} MXN. Conecta talleres de alfarería y talavera en activo por calles tranquilas.`
            : `Tailored to ${timeMin} min and $${budget} MXN. Connects active pottery and Talavera workshops via quiet streets.`
      },
      {
        id: 'sug_heritage',
        name:
          language === 'es'
            ? 'Ruta Tesoros Virreinales y Plazuelas'
            : 'Viceregal Treasures & Plazas',
        badge: language === 'es' ? 'Historia' : 'Heritage',
        badgeColor: 'border-[#0F3078]/30 bg-[#0F3078]/10 text-[#0F3078]',
        route: routeHeritage,
        why:
          language === 'es'
            ? 'Recorre claustros, fuentes barrocas y el Barrio del Artista por banquetas amplias con pendientes suaves.'
            : 'Links colonial cloisters, baroque fountains, and the Artists Quarter via wide sidewalks.'
      },
      {
        id: 'sug_express',
        name:
          language === 'es'
            ? 'Paseo Exprés de Callejones y Murales'
            : 'Express Alleys & Murals Walk',
        badge: language === 'es' ? 'Corta' : 'Express',
        badgeColor: 'border-[#1D6B52]/30 bg-[#1D6B52]/10 text-[#1D6B52]',
        route: routeExpress,
        why:
          language === 'es'
            ? 'Ideal para una caminata ligera de menos de una hora por Los Sapos y los murales de Xanenetla.'
            : 'Ideal for a relaxed walk under an hour through Los Sapos and Xanenetla murals.'
      }
    ];
  }, [graph, matrices, pois, language, budget, timeMin, interest, profile]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#0A1E4A]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-slide"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#FAF6EE] border-t-4 sm:border-4 border-[#0F3078] rounded-t-[28px] sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden text-[#162035]"
      >
        {/* 1. Cabecera Fija */}
        <header className="px-5 py-3.5 bg-[#0F3078] text-[#FAF6EE] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <Compass className="w-4 h-4 text-[#F0B43A]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[#FAF6EE] font-serif truncate">
                {language === 'es' ? 'Armar mi Recorrido' : 'Build My Walk'}
              </h2>
              <p className="text-[11px] text-[#DCE6F9] truncate">
                {language === 'es'
                  ? 'Elige tu tiempo y preferencias para ver opciones'
                  : 'Choose your time and preferences to see options'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer flex-shrink-0"
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Cuerpo con Scroll Propio */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-[#0F3078]/15 space-y-3.5 shadow-xs">
            {/* Presupuesto y Tiempo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F3078] flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-[#B84A2C]" />
                    {language === 'es' ? 'Gasto' : 'Budget'}
                  </span>
                  <span className="font-mono font-bold text-[#B84A2C]">${budget} MXN</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: language === 'es' ? 'Gratis' : 'Free', val: 0 },
                    { label: '$150', val: 150 },
                    { label: '$300', val: 300 }
                  ].map((b) => (
                    <button
                      key={b.val}
                      type="button"
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        setBudget(b.val);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer truncate ${
                        budget === b.val
                          ? 'bg-[#0F3078] text-[#FAF6EE]'
                          : 'bg-[#FAF6EE] text-[#0F3078] border border-[#0F3078]/15'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F3078] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#0F3078]" />
                    {language === 'es' ? 'Tiempo' : 'Time'}
                  </span>
                  <span className="font-mono font-bold text-[#0F3078]">{timeMin} min</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '45 min', val: 45 },
                    { label: '90 min', val: 90 },
                    { label: '150 min', val: 150 }
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        setTimeMin(t.val);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer truncate ${
                        timeMin === t.val
                          ? 'bg-[#0F3078] text-[#FAF6EE]'
                          : 'bg-[#FAF6EE] text-[#0F3078] border border-[#0F3078]/15'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interés Principal */}
            <div className="space-y-1.5">
              <span className="font-bold text-[#0F3078] text-xs block">
                {language === 'es' ? 'Tema principal' : 'Main interest'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  {
                    id: 'artisans' as InterestCategory,
                    icon: Flame,
                    label: language === 'es' ? 'Talleres' : 'Workshops'
                  },
                  {
                    id: 'heritage' as InterestCategory,
                    icon: Compass,
                    label: language === 'es' ? 'Historia' : 'Heritage'
                  },
                  {
                    id: 'street_art' as InterestCategory,
                    icon: Sparkles,
                    label: language === 'es' ? 'Murales' : 'Murals'
                  },
                  {
                    id: 'gastronomy' as InterestCategory,
                    icon: HeartHandshake,
                    label: language === 'es' ? 'Sabores' : 'Food'
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
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer min-w-0 ${
                        isSelected
                          ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                          : 'bg-[#FAF6EE] text-[#0F3078] border border-[#0F3078]/15'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Movilidad */}
            <div className="space-y-1.5">
              <span className="font-bold text-[#0F3078] text-xs block">
                {language === 'es' ? 'Tipo de paso' : 'Mobility'}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    id: 'sin_restriccion' as MobilityProfile,
                    icon: Footprints,
                    label: language === 'es' ? 'Estándar' : 'Standard'
                  },
                  {
                    id: 'silla_de_ruedas' as MobilityProfile,
                    icon: Accessibility,
                    label: language === 'es' ? 'Sin escalón' : 'Step-free'
                  },
                  {
                    id: 'movilidad_reducida' as MobilityProfile,
                    icon: ShieldCheck,
                    label: language === 'es' ? 'Tranquilo' : 'Gentle'
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
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer min-w-0 ${
                        isSelected
                          ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                          : 'bg-[#FAF6EE] text-[#0F3078] border border-[#0F3078]/15'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Opciones de Ruta */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-[#0F3078] uppercase tracking-wider">
              {language === 'es' ? 'Rutas recomendadas' : 'Recommended routes'}
            </h3>

            {suggestions.map((sug) => {
              const r = sug.route;
              return (
                <div
                  key={sug.id}
                  className="bg-white border border-[#0F3078]/20 rounded-2xl p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${sug.badgeColor}`}
                      >
                        {sug.badge}
                      </span>
                      <h4 className="font-serif font-black text-sm text-[#0F3078] truncate">
                        {sug.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0F3078]">
                      <span className="bg-[#FAF6EE] px-2 py-0.5 rounded-lg border border-[#0F3078]/15">
                        {r.stops.length} {language === 'es' ? 'paradas' : 'stops'}
                      </span>
                      <span className="bg-[#FAF6EE] px-2 py-0.5 rounded-lg border border-[#0F3078]/15">
                        {r.metrics.total_time_min}m
                      </span>
                      <span className="bg-[#B84A2C]/10 text-[#B84A2C] px-2 py-0.5 rounded-lg">
                        ${r.metrics.total_cost_mxn}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#162035]/80 leading-relaxed flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1D6B52] flex-shrink-0 mt-0.5" />
                    <span>{sug.why}</span>
                  </p>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    {r.stops.map((stop) => (
                      <span
                        key={stop.poi.id}
                        className="text-[10px] whitespace-nowrap bg-[#FAF6EE] border border-[#0F3078]/15 px-2 py-1 rounded-lg text-[#0F3078] flex items-center gap-1 font-medium"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-[#0F3078] text-[#FAF6EE] font-bold flex items-center justify-center text-[9px] flex-shrink-0">
                          {stop.stop_order}
                        </span>
                        <span className="truncate max-w-[120px]">{stop.poi.name}</span>
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      tacticalAudio.playStampSuccess();
                      onSelectRoute(r);
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Elegir esta ruta' : 'Select this route'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
