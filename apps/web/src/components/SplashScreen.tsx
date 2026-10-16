import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronRight, Volume2, VolumeX, Compass } from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';
import { TalaveraFrieze, TalaveraCorner, TalaveraPlateMedallion } from './TalaveraOrnament';

interface SplashScreenProps {
  onFinish: () => void;
  isLoadingData?: boolean;
  language?: 'es' | 'en';
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  isLoadingData = false,
  language = 'es'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const canSkip = true;

  // Intentar reproducir el video al montar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch((err) => {
      console.warn('Autoplay prevented, fallback to interactive:', err);
    });

    const handleTimeUpdate = () => {
      if (video.duration && !isNaN(video.duration)) {
        const pct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
        setProgress(pct);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const handleComplete = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    tacticalAudio.playTacticalClick();
    setTimeout(() => {
      onFinish();
    }, 450);
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between talavera-bg-pattern text-[#162035] transition-opacity duration-500 selection:bg-[#0F3078] selection:text-[#FAF6EE] overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Cenefa Superior de Azulejo Poblano y Ladrillo Petatillo */}
      <div className="w-full z-20">
        <div className="w-full talavera-cobalt-pattern px-4 py-2.5 shadow-md">
          <header className="w-full max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TalaveraPlateMedallion size="sm" variant="polychrome">
                <img
                  src="/popogo-logo.png"
                  alt="PopoGo Logo"
                  className="w-6 h-6 rounded-full object-contain"
                />
              </TalaveraPlateMedallion>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-wider text-[#FAF6EE] font-serif flex items-center gap-2 drop-shadow">
                  <span>PopoGo</span>
                  <span className="text-[10px] font-sans font-extrabold px-2 py-0.5 rounded-full bg-[#B84A2C] text-[#FAF6EE] border border-[#F0B43A] tracking-widest uppercase">
                    Puebla
                  </span>
                </h1>
                <p className="text-[10px] text-[#DCE6F9] font-medium tracking-wide">
                  {language === 'es' ? 'Talavera • Barrios & Patrimonio Vivo' : 'Talavera • Historic Walks'}
                </p>
              </div>
            </div>

            {/* Botón Saltar */}
            {canSkip && (
              <button
                type="button"
                onClick={handleComplete}
                className="px-3.5 py-1.5 rounded-full bg-[#FAF6EE] hover:bg-white active:scale-95 border-2 border-[#D48914] text-[#0F3078] text-xs font-extrabold flex items-center gap-1 transition-all shadow-md cursor-pointer"
              >
                <span>{language === 'es' ? 'Entrar' : 'Enter'}</span>
                <ChevronRight className="w-4 h-4 text-[#B84A2C]" />
              </button>
            )}
          </header>
        </div>
        <TalaveraFrieze />
      </div>

      {/* Contenedor Central con Marco de Azulejo de Talavera */}
      <main className="w-full max-w-sm my-auto flex flex-col items-center justify-center z-10 px-4 py-2">
        <div className="relative w-full p-3 rounded-[28px] talavera-plate-card flex flex-col items-center">
          <TalaveraCorner position="tl" />
          <TalaveraCorner position="tr" />
          <TalaveraCorner position="bl" />
          <TalaveraCorner position="br" />

          <div className="relative w-full aspect-[9/16] max-h-[46vh] sm:max-h-[50vh] rounded-2xl overflow-hidden border-2 border-[#0F3078] bg-[#0A1E4A] flex items-center justify-center group shadow-inner">
            {!videoError ? (
              <video
                ref={videoRef}
                src="/splash.mp4"
                playsInline
                autoPlay
                muted={isMuted}
                onEnded={handleComplete}
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 talavera-cobalt-pattern w-full h-full">
                <TalaveraPlateMedallion size="xl" variant="polychrome" animate>
                  <img
                    src="/popogo-logo.png"
                    alt="PopoGo"
                    className="w-12 h-12 rounded-full object-contain"
                  />
                </TalaveraPlateMedallion>
                <p className="text-sm font-bold text-[#FAF6EE] font-serif">
                  {language === 'es' ? 'Bienvenido a PopoGo Puebla' : 'Welcome to PopoGo Puebla'}
                </p>
              </div>
            )}

            {!videoError && (
              <button
                type="button"
                onClick={toggleSound}
                className="absolute bottom-3 right-3 p-2 rounded-full bg-[#FAF6EE]/95 hover:bg-white text-[#0F3078] border-2 border-[#0F3078] transition-transform hover:scale-110 shadow-lg cursor-pointer"
                title={isMuted ? 'Activar audio' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-[#B84A2C]" /> : <Volume2 className="w-4 h-4 text-[#0F3078]" />}
              </button>
            )}
          </div>

          {/* Lema de Identidad Poblana sobre Esmalte Marfil */}
          <div className="mt-3 text-center space-y-1 px-2">
            <div className="flex items-center justify-center gap-1.5 text-[#0F3078]">
              <Sparkles className="w-3.5 h-3.5 text-[#B84A2C]" />
              <span className="text-[11px] font-black uppercase tracking-widest font-serif">
                {language === 'es' ? 'Arte Talavera & Ladrillo de Petatillo' : 'Talavera & Puebla Heritage'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#D48914]" />
            </div>
            <p className="text-[11px] text-[#162035]/85 font-medium leading-snug">
              {language === 'es'
                ? 'Rutas peatonales accesibles por Zócalo, Analco, La Luz, El Alto y Xanenetla.'
                : 'Accessible walking routes across Puebla’s historic neighborhoods.'}
            </p>
          </div>
        </div>
      </main>

      {/* Pie con Barra de Carga & Los 6 Pigmentos Minerales de la Talavera de Puebla */}
      <footer className="w-full z-10 bg-[#FAF6EE]/95 border-t-2 border-[#0F3078] px-4 py-3 shadow-[0_-8px_25px_rgba(15,48,120,0.12)]">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Barra de progreso policroma */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#0F3078]">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#B84A2C] animate-spin" />
                {isLoadingData
                  ? (language === 'es' ? 'Horneando mapa y patrimonio...' : 'Loading map & heritage...')
                  : (language === 'es' ? 'Esmaltando experiencia...' : 'Starting PopoGo...')}
              </span>
              <span className="font-mono text-[#B84A2C]">{progress}%</span>
            </div>

            <div className="w-full h-2.5 bg-[#F2EBDC] rounded-full overflow-hidden p-0.5 border border-[#0F3078]/40 shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-[#0F3078] via-[#1B49AC] via-[#B84A2C] to-[#D48914]"
                style={{ width: `${Math.max(10, progress)}%` }}
              />
            </div>
          </div>

          {/* Muestra de los 6 Pigmentos Minerales Tradicionales de Talavera (DOT4) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 border-t border-[#0F3078]/15">
            <div className="flex items-center gap-1" title="Blanco Majólica #FAF6EE (Esmalte de Estaño)">
              <span className="w-3 h-3 rounded-full bg-[#FAF6EE] border-2 border-[#0F3078] shadow-sm" />
              <span className="text-[10px] font-bold text-[#162035]">Majólica</span>
            </div>
            <div className="flex items-center gap-1" title="Azul Cobalto #0F3078 (Plumilla Mineral)">
              <span className="w-3 h-3 rounded-full bg-[#0F3078] border border-white shadow-sm" />
              <span className="text-[10px] font-bold text-[#0F3078]">Cobalto</span>
            </div>
            <div className="flex items-center gap-1" title="Aguada Celeste #3E6FD1 (Media Tinta)">
              <span className="w-3 h-3 rounded-full bg-[#3E6FD1] border border-white shadow-sm" />
              <span className="text-[10px] font-bold text-[#1B49AC]">Aguada</span>
            </div>
            <div className="flex items-center gap-1" title="Terracota Petatillo #B84A2C (Barro de Analco)">
              <span className="w-3 h-3 rounded-full bg-[#B84A2C] border border-white shadow-sm" />
              <span className="text-[10px] font-bold text-[#B84A2C]">Terracota</span>
            </div>
            <div className="flex items-center gap-1" title="Amarillo Ocre #D48914 (Ocre de Nápoles)">
              <span className="w-3 h-3 rounded-full bg-[#D48914] border border-white shadow-sm" />
              <span className="text-[10px] font-bold text-[#9A6208]">Ocre</span>
            </div>
            <div className="flex items-center gap-1" title="Verde Cobre #1D6B52 (Pigmento Mineral)">
              <span className="w-3 h-3 rounded-full bg-[#1D6B52] border border-white shadow-sm" />
              <span className="text-[10px] font-bold text-[#1D6B52]">Verde Cobre</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

