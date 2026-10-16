import { type FC } from 'react';
import { Compass, Route, Sparkles, Award, Store, Crosshair } from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';

export type CommandTab = 'explore' | 'itinerary' | 'passport' | 'artisans';

interface MobileBottomNavProps {
  activeTab: CommandTab;
  onSelectTab: (tab: CommandTab) => void;
  onUrbanPulse: () => void;
  isPulseActive: boolean;
  unlockedCount: number;
  language: 'es' | 'en';
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onUrbanPulse,
  isPulseActive,
  unlockedCount,
  language
}) => {
  const handleTabClick = (tab: CommandTab) => {
    tacticalAudio.playTacticalClick();
    onSelectTab(tab);
  };

  const handlePulse = () => {
    tacticalAudio.playUrbanPulse();
    onUrbanPulse();
  };

  return (
    <nav
      aria-label="Centro de mando táctico"
      className="fixed bottom-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none select-none"
    >
      <div className="pointer-events-auto max-w-sm w-full bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 shadow-[0_15px_45px_rgba(0,0,0,0.9)] flex items-center justify-between relative">
        {/* TAB 1: EXPLORAR (Mapa 3D) */}
        <button
          type="button"
          onClick={() => handleTabClick('explore')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'explore'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'explore'
                ? 'bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400'
            }`}
          >
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">
            {language === 'es' ? 'Explorar' : 'Explore'}
          </span>
        </button>

        {/* TAB 2: ITINERARIO (Bottom Sheet) */}
        <button
          type="button"
          onClick={() => handleTabClick('itinerary')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'itinerary'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'itinerary'
                ? 'bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400'
            }`}
          >
            <Route className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">
            {language === 'es' ? 'Itinerario' : 'Route'}
          </span>
        </button>

        {/* BOTÓN CENTRAL ELEVADO: ACTION ORB "PULSO URBANO" */}
        <div className="relative -mt-7 flex flex-col items-center justify-center px-1">
          {/* Anillo de pulso radar concéntrico cuando está activo */}
          <div
            className={`absolute -inset-2 rounded-full border-2 border-amber-400/60 pointer-events-none transition-all duration-700 ${
              isPulseActive ? 'radar-wave opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`absolute -inset-4 rounded-full border border-sky-400/40 pointer-events-none transition-all duration-1000 ${
              isPulseActive ? 'radar-wave delay-300 opacity-80' : 'opacity-0'
            }`}
          />

          <button
            type="button"
            onClick={handlePulse}
            aria-label="Activar Pulso Urbano y radar de proximidad a 50 metros"
            className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 text-slate-950 p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.85)] active:scale-95 transition-all flex items-center justify-center border-2 border-slate-950 cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-inner">
              {isPulseActive ? (
                <Crosshair className="w-7 h-7 text-slate-950 animate-spin" />
              ) : (
                <Sparkles className="w-7 h-7 text-slate-950 group-hover:scale-110 transition-transform" />
              )}
            </div>
          </button>

          <span className="text-[9px] font-mono uppercase tracking-widest font-black text-amber-400 mt-1 whitespace-nowrap">
            {language === 'es' ? 'Pulso' : 'Pulse'}
          </span>
        </div>

        {/* TAB 3: PASAPORTE (Insignias Holográficas) */}
        <button
          type="button"
          onClick={() => handleTabClick('passport')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all relative cursor-pointer ${
            activeTab === 'passport'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all relative ${
              activeTab === 'passport'
                ? 'bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400'
            }`}
          >
            <Award className="w-5 h-5" />
            {unlockedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-mono font-black text-[9px] flex items-center justify-center shadow">
                {unlockedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">
            {language === 'es' ? 'Pasaporte' : 'Passport'}
          </span>
        </button>

        {/* TAB 4: TALLERES (Directorio de Maestros Artesanos) */}
        <button
          type="button"
          onClick={() => handleTabClick('artisans')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'artisans'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'artisans'
                ? 'bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'text-slate-400'
            }`}
          >
            <Store className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">
            {language === 'es' ? 'Talleres' : 'Crafts'}
          </span>
        </button>
      </div>
    </nav>
  );
};
