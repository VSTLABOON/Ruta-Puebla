import { useState, type FC } from 'react';
import {
  Compass,
  Route,
  Sparkles,
  Award,
  Crosshair,
  Grid,
  SlidersHorizontal,
  Store,
  Download,
  Languages,
  Filter,
  KeyRound,
  X,
  Smartphone,
  Monitor,
  Trophy
} from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';
import { UserProfile } from '../types/userRecord';

export type CommandTab = 'explore' | 'itinerary' | 'passport' | 'artisans';

interface MobileBottomNavProps {
  activeTab: CommandTab;
  onSelectTab: (tab: CommandTab) => void;
  onUrbanPulse: () => void;
  isPulseActive: boolean;
  unlockedCount: number;
  language: 'es' | 'en';
  currentUser?: UserProfile | null;
  onOpenTuneRoute?: () => void;
  onOpenArtisansDirectory?: () => void;
  onExportRoute?: () => void;
  onOpenAuth?: () => void;
  onOpenRecord?: () => void;
  onOpenDataInfo?: () => void;
  onToggleLanguage?: () => void;
  onToggleViewport?: () => void;
  viewportMode?: 'mobile' | 'full';
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onUrbanPulse,
  isPulseActive,
  unlockedCount,
  language,
  currentUser,
  onOpenTuneRoute,
  onOpenArtisansDirectory,
  onExportRoute,
  onOpenAuth,
  onOpenRecord,
  onOpenDataInfo,
  onToggleLanguage,
  onToggleViewport,
  viewportMode = 'full'
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabClick = (tab: CommandTab) => {
    tacticalAudio.playTacticalClick();
    onSelectTab(tab);
    setIsMenuOpen(false);
  };

  const handlePulse = () => {
    tacticalAudio.playUrbanPulse();
    onUrbanPulse();
  };

  const toggleMenu = () => {
    tacticalAudio.playTacticalClick();
    setIsMenuOpen((v) => !v);
  };

  return (
    <>
      {/* Menú Desplegable Flotante estilo ClickUp (Mobile Quick-Tools Sheet) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col justify-end pb-20 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-12 pointer-events-none'
        }`}
      >
        {/* Fondo táctil para cerrar */}
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-[var(--primary)]/20 backdrop-blur-sm -z-10"
        />

        <div className="w-full max-w-sm mx-auto bg-[#FAF6EE]/98 backdrop-blur-2xl border-2 border-[#0F3078] rounded-3xl p-4 shadow-[0_-15px_45px_rgba(15,48,120,0.3)] space-y-3.5">
          {/* Grab handle */}
          <div className="flex items-center justify-between pb-2 border-b border-[#0F3078]/15">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-[#B84A2C]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#0F3078] font-serif">
                {language === 'es' ? 'Herramientas de Puebla' : 'Puebla Tools'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1 rounded-lg bg-[#0F3078]/10 text-[#0F3078] hover:bg-[#0F3078] hover:text-[#FAF6EE] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid de Acciones Secundarias (Talavera Tiles) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {onOpenTuneRoute && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsMenuOpen(false);
                  onOpenTuneRoute();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#D48914]/15 text-[#D48914] flex items-center justify-center border border-[#D48914]/30">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#0F3078] text-[11px]">
                  {language === 'es' ? 'Ajustes de Ruta' : 'Tune Route'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {language === 'es' ? 'Tiempo, presupuesto y accesibilidad' : 'Time, budget, access'}
                </span>
              </button>
            )}

            {onOpenArtisansDirectory && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsMenuOpen(false);
                  onOpenArtisansDirectory();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#B84A2C]/15 text-[#B84A2C] flex items-center justify-center border border-[#B84A2C]/30">
                  <Store className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#0F3078] text-[11px]">
                  {language === 'es' ? 'Talleres de Barrio' : 'Local Workshops'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {language === 'es' ? '24 maestros y hornos en vivo' : '24 master artisans'}
                </span>
              </button>
            )}

            {onExportRoute && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsMenuOpen(false);
                  onExportRoute();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#1D6B52]/15 text-[#1D6B52] flex items-center justify-center border border-[#1D6B52]/30">
                  <Download className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#0F3078] text-[11px]">
                  {language === 'es' ? 'Guardar Itinerario' : 'Export Route'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {language === 'es' ? 'Descargar guía en texto' : 'Download text guide'}
                </span>
              </button>
            )}

            {onOpenRecord && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsMenuOpen(false);
                  onOpenRecord();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#D48914]/30 hover:border-[#D48914] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#D48914]/20 text-[#D48914] flex items-center justify-center border border-[#D48914]/40">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#B84A2C] text-[11px]">
                  {language === 'es' ? 'Mi Récord & Bitácora' : 'My Records & Log'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {currentUser
                    ? `${currentUser.nickname} • Nv.${currentUser.level}`
                    : language === 'es'
                    ? 'Estadísticas y grabador de ruta'
                    : 'Live tracker & personal bests'}
                </span>
              </button>
            )}

            {onOpenAuth && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsMenuOpen(false);
                  onOpenAuth();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#0F3078]/15 text-[#0F3078] flex items-center justify-center border border-[#0F3078]/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#0F3078] text-[11px]">
                  {currentUser
                    ? language === 'es' ? 'Cuenta / Perfil' : 'Account / Profile'
                    : language === 'es' ? 'Acceso / Login' : 'Login / Register'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {currentUser
                    ? language === 'es' ? 'Gestionar sesión' : 'Manage session'
                    : language === 'es' ? 'Explorador, artesano o gobierno' : 'Explorer, artisan or admin'}
                </span>
              </button>
            )}

            {onToggleLanguage && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  onToggleLanguage();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#6D438A]/15 text-[#6D438A] flex items-center justify-center border border-[#6D438A]/30">
                  <Languages className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#0F3078] text-[11px]">
                  {language === 'es' ? 'Idioma: Español' : 'Language: English'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {language === 'es' ? 'Toca para cambiar a English' : 'Tap for Español'}
                </span>
              </button>
            )}

            {onOpenDataInfo && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsMenuOpen(false);
                  onOpenDataInfo();
                }}
                className="p-3 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex flex-col items-start gap-1.5 transition text-left cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-xl bg-[#0F3078]/15 text-[#0F3078] flex items-center justify-center border border-[#0F3078]/30">
                  <Filter className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-[#0F3078] text-[11px]">
                  {language === 'es' ? 'Datos DENUE' : 'DENUE Census'}
                </span>
                <span className="text-[10px] text-[#162035]/70">
                  {language === 'es' ? 'Auditorías y metodología' : 'Audits & methodology'}
                </span>
              </button>
            )}

            {onToggleViewport && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  onToggleViewport();
                  setIsMenuOpen(false);
                }}
                className="col-span-2 p-2.5 rounded-2xl bg-white/95 hover:bg-[#DCE6F9]/30 border-2 border-[#0F3078]/20 hover:border-[#0F3078] flex items-center justify-between text-left cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  {viewportMode === 'mobile' ? (
                    <Monitor className="w-4 h-4 text-[#0F3078]" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-[#0F3078]" />
                  )}
                  <span className="font-bold text-[#0F3078] text-[11px]">
                    {viewportMode === 'mobile'
                      ? language === 'es' ? 'Cambiar a Pantalla Completa' : 'Switch to Full Screen'
                      : language === 'es' ? 'Simulador Móvil 390×844' : 'Mobile 390x844 Frame'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#B84A2C] font-bold">
                  {viewportMode === 'mobile' ? 'Full View' : 'Frame 390'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dock Inferior Talavera Fijo */}
      <nav
        aria-label="Centro de mando táctico"
        className="fixed bottom-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none select-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="pointer-events-auto max-w-sm w-full bg-[#FAF6EE]/95 backdrop-blur-2xl border-2 border-[#0F3078] rounded-3xl p-1.5 shadow-[0_12px_40px_rgba(15,48,120,0.25)] flex items-center justify-between relative">
          {/* TAB 1: EXPLORAR (Mapa 3D) */}
          <button
            type="button"
            onClick={() => handleTabClick('explore')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'text-[#0F3078] font-bold'
                : 'text-[#162035]/60 hover:text-[#0F3078]'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'explore'
                  ? 'bg-[#0F3078]/15 text-[#0F3078] shadow-sm'
                  : 'text-[#162035]/60'
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
                ? 'text-[#0F3078] font-bold'
                : 'text-[#162035]/60 hover:text-[#0F3078]'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'itinerary'
                  ? 'bg-[#0F3078]/15 text-[#0F3078] shadow-sm'
                  : 'text-[#162035]/60'
              }`}
            >
              <Route className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">
              {language === 'es' ? 'Itinerario' : 'Route'}
            </span>
          </button>

          {/* BOTÓN CENTRAL ELEVADO: PLATO DE TALAVERA "PULSO URBANO" */}
          <div className="relative -mt-7 flex flex-col items-center justify-center px-1">
            <div
              className={`absolute -inset-2 rounded-full border-2 border-[#0F3078]/50 pointer-events-none transition-all duration-700 ${
                isPulseActive ? 'radar-wave opacity-100' : 'opacity-0'
              }`}
            />
            <div
              className={`absolute -inset-4 rounded-full border border-[#B84A2C]/50 pointer-events-none transition-all duration-1000 ${
                isPulseActive ? 'radar-wave delay-300 opacity-80' : 'opacity-0'
              }`}
            />

            <button
              type="button"
              onClick={handlePulse}
              aria-label="Activar Pulso Urbano de Talavera"
              className="group relative w-14 h-14 rounded-full bg-[#FAF6EE] p-0.5 shadow-[0_6px_25px_rgba(15,48,120,0.45)] hover:shadow-[0_8px_30px_rgba(15,48,120,0.65)] active:scale-95 transition-all flex items-center justify-center border-2 border-[#0F3078] cursor-pointer"
            >
              {/* Borde concéntrico interior de Talavera */}
              <div className="w-full h-full rounded-full border border-dashed border-[#0F3078]/50 flex items-center justify-center bg-gradient-to-tr from-[#FAF6EE] to-[#FFFDF9]">
                {isPulseActive ? (
                  <Crosshair className="w-7 h-7 text-[#0F3078] animate-spin" />
                ) : (
                  <Sparkles className="w-7 h-7 text-[#0F3078] group-hover:scale-110 group-hover:text-[#B84A2C] transition-all" />
                )}
              </div>
            </button>

            <span className="text-[9px] font-mono uppercase tracking-widest font-black text-[#0F3078] mt-1 whitespace-nowrap">
              {language === 'es' ? 'Pulso' : 'Pulse'}
            </span>
          </div>

          {/* TAB 3: PASAPORTE (Insignias) */}
          <button
            type="button"
            onClick={() => handleTabClick('passport')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all relative cursor-pointer ${
              activeTab === 'passport'
                ? 'text-[#0F3078] font-bold'
                : 'text-[#162035]/60 hover:text-[#0F3078]'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all relative ${
                activeTab === 'passport'
                  ? 'bg-[#0F3078]/15 text-[#0F3078] shadow-sm'
                  : 'text-[#162035]/60'
              }`}
            >
              <Award className="w-5 h-5" />
              {unlockedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B84A2C] text-[#FAF6EE] font-mono font-black text-[9px] flex items-center justify-center shadow">
                  {unlockedCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">
              {language === 'es' ? 'Pasaporte' : 'Passport'}
            </span>
          </button>

          {/* TAB 4: MENÚ / MÁS */}
          <button
            type="button"
            onClick={toggleMenu}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all cursor-pointer ${
              isMenuOpen
                ? 'text-[#0F3078] font-bold'
                : 'text-[#162035]/60 hover:text-[#0F3078]'
            }`}
            title={language === 'es' ? 'Menú de opciones' : 'Tools menu'}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isMenuOpen
                  ? 'bg-[#0F3078]/15 text-[#0F3078] shadow-sm'
                  : 'text-[#162035]/60'
              }`}
            >
              <Grid className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">
              {language === 'es' ? 'Menú' : 'Menu'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
