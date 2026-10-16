import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronRight, Volume2, VolumeX, Compass } from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';

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
      className={`popogo-splash fixed inset-0 z-[100] flex flex-col items-center justify-between p-4 sm:p-6 transition-opacity duration-500 selection:bg-[var(--accent)] selection:text-[var(--accent-ink)] ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #1738B5 0%, #0E2C9C 45%, #07154E 90%, #030A26 100%)'
      }}
    >
      {/* Patrón sutil estilo Talavera poblana en el fondo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(#EDE28E 1.5px, transparent 1.5px), radial-gradient(#9597C1 1.5px, transparent 1.5px)`,
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px'
        }}
      />

      {/* Barra Superior con Logo y Omitir */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/popogo-logo.png"
            alt="PopoGo Logo"
            className="w-10 h-10 rounded-full border-2 border-[var(--line)] shadow-[var(--shadow)] object-contain bg-[var(--surface-solid)] p-0.5"
          />
          <div>
            <h1 className="text-xl font-black tracking-wider text-[var(--ink)] font-serif flex items-center gap-1.5 drop-shadow">
              <span>PopoGo</span>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] tracking-widest uppercase">
                Puebla
              </span>
            </h1>
            <p className="text-[10px] text-[var(--muted)] font-medium tracking-wide">
              {language === 'es' ? 'Caminatas & Patrimonio Vivo' : 'Accessible Historic Walks'}
            </p>
          </div>
        </div>

        {/* Botón Saltar */}
        {canSkip && (
          <button
            type="button"
            onClick={handleComplete}
            className="px-3.5 py-1.5 rounded-full bg-[var(--surface)] hover:bg-[var(--surface)] active:scale-95 border border-[var(--line)] text-[var(--ink)] text-xs font-bold flex items-center gap-1 backdrop-blur-md transition-all shadow cursor-pointer"
          >
            <span>{language === 'es' ? 'Entrar' : 'Enter'}</span>
            <ChevronRight className="w-4 h-4 text-[var(--brand)]" />
          </button>
        )}
      </header>

      {/* Contenedor Central del Video Animado / Splash */}
      <main className="w-full max-w-sm my-auto flex flex-col items-center justify-center z-10 px-2">
        <div className="relative w-full aspect-[9/16] max-h-[52vh] sm:max-h-[58vh] rounded-3xl overflow-hidden shadow-[var(--shadow)] border-2 border-[var(--line)] bg-[var(--primary)] flex items-center justify-center group">
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
            /* Fallback animado en caso de error o navegador sin soporte mp4 */
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <img
                src="/popogo-logo.png"
                alt="PopoGo"
                className="w-40 h-40 rounded-full border-4 border-[var(--line)] shadow-[var(--shadow)] animate-pulse"
              />
              <p className="text-sm font-bold text-[var(--ink)]">
                {language === 'es' ? 'Bienvenido a PopoGo Puebla' : 'Welcome to PopoGo Puebla'}
              </p>
            </div>
          )}

          {/* Botón de Sonido Flotante sobre el video */}
          {!videoError && (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-[var(--primary)]/80 hover:bg-[var(--primary)] text-[var(--on-primary)] border border-[var(--line)] backdrop-blur-md transition-transform hover:scale-110 shadow-[var(--shadow)] cursor-pointer"
              title={isMuted ? 'Activar audio' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[var(--brand)]" /> : <Volume2 className="w-4 h-4 text-[var(--brand)]" />}
            </button>
          )}

          {/* Brillo holográfico perimetral */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-[var(--line-strong)]" />
        </div>

        {/* Lema de Identidad Poblana */}
        <div className="mt-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[var(--brand)]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-extrabold uppercase tracking-widest font-mono">
              {language === 'es' ? 'Identidad Talavera • Centro Histórico' : 'Talavera Identity • Historic Center'}
            </span>
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs text-[var(--ink-soft)] max-w-xs mx-auto">
            {language === 'es'
              ? 'Rutas peatonales accesibles, talleres artesanales y secretos vivos de Puebla.'
              : 'Accessible walking routes, artisan workshops, and living secrets of Puebla.'}
          </p>
        </div>
      </main>

      {/* Pie con Barra de Carga & Paleta de Colores de Identidad */}
      <footer className="w-full max-w-md mx-auto space-y-3 z-10 pb-2">
        {/* Barra de progreso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--ink)]">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[var(--brand)] animate-spin" />
              {isLoadingData
                ? (language === 'es' ? 'Preparando mapa y patrimonio...' : 'Loading map & heritage...')
                : (language === 'es' ? 'Iniciando PopoGo...' : 'Starting PopoGo...')}
            </span>
            <span className="font-mono text-[var(--brand)]">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-[var(--surface-solid)] rounded-full overflow-hidden p-0.5 border border-[var(--line)] shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-200 bg-[var(--brand)]"
              style={{ width: `${Math.max(8, progress)}%` }}
            />
          </div>
        </div>

        {/* Muestra de la Paleta Oficial de Colores de PopoGo */}
        <div className="flex items-center justify-center gap-2 pt-1 border-t border-[var(--line)]">
          <div className="flex items-center gap-1.5" title="Azul Cobalto #0E2C9C (Dominante Talavera)">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)] ring-1 ring-[var(--line-strong)] shadow-sm" />
            <span className="text-[10px] text-[var(--ink-soft)] hidden sm:inline">Cobalto</span>
          </div>
          <div className="flex items-center gap-1.5" title="Azul Lavanda #9597C1 (Detalles)">
            <span className="w-3 h-3 rounded-full bg-[var(--muted)] ring-1 ring-[var(--line-strong)] shadow-sm" />
            <span className="text-[10px] text-[var(--ink-soft)] hidden sm:inline">Lavanda</span>
          </div>
          <div className="flex items-center gap-1.5" title="Amarillo Pastel #EDE28E (Acentos)">
            <span className="w-3 h-3 rounded-full bg-[var(--accent)] ring-1 ring-[var(--line-strong)] shadow-sm" />
            <span className="text-[10px] text-[var(--ink-soft)] hidden sm:inline">Amarillo</span>
          </div>
          <div className="flex items-center gap-1.5" title="Malva #7B5E86 (Cálido)">
            <span className="w-3 h-3 rounded-full bg-[var(--well)] ring-1 ring-[var(--line-strong)] shadow-sm" />
            <span className="text-[10px] text-[var(--ink-soft)] hidden sm:inline">Malva</span>
          </div>
          <div className="flex items-center gap-1.5" title="Blanco Hielo #EFF1F8 (Fondo)">
            <span className="w-3 h-3 rounded-full bg-[var(--surface-solid)] ring-1 ring-[var(--line-strong)] shadow-sm" />
            <span className="text-[10px] text-[var(--ink-soft)] hidden sm:inline">Blanco Hielo</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
