import { useEffect, useRef, type FC } from 'react';
import { Award, CheckCircle2, Sparkles, X, MapPin } from 'lucide-react';
import { Language } from '@ruta-abierta/shared-types';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeName: string;
  title: string;
  description: string;
  zone: string;
  language: Language;
}

export const CelebrationModal: FC<CelebrationModalProps> = ({
  isOpen,
  onClose,
  badgeName,
  title,
  description,
  zone,
  language
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reproducción de acorde sonoro triunfal con Web Audio API (100% nativo y sin archivos externos)
  useEffect(() => {
    if (!isOpen) return;

    // Vibración háptica en teléfonos móviles compatibles
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 60, 180]);
      } catch {}
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Acorde mayor brillante)

        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

          gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.08 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.65);
        });
      }
    } catch {}
  }, [isOpen]);

  // Animación de partículas doradas en Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#fbbf24', '#38bdf8', '#34d399', '#ffffff', '#e0e7ff'];
    const particleCount = 75;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 8
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach((p) => {
        if (p.alpha > 0) {
          aliveCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.25; // Gravedad suave
          p.alpha -= p.decay;
          p.rotation += p.vRot;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--surface)] backdrop-blur-md flex items-center justify-center p-4 select-none">
      {/* Canvas de partículas de celebración */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Contenedor de la Tarjeta Holográfica Coleccionable */}
      <div className="relative z-20 max-w-sm w-full animate-in zoom-in-90 duration-300">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-[var(--muted)] hover:text-[var(--ink)] rounded-full bg-[var(--surface)] border border-[var(--line)] transition"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tarjeta Holográfica Reflectante */}
        <div className="holographic-card rounded-3xl p-6 text-[var(--ink)] shadow-[var(--shadow)] space-y-5 border border-[var(--line)]">
          {/* Cabecera de Insignia */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] border border-[var(--line)] text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
              {language === 'es' ? 'Secreto Desbloqueado' : 'Secret Unlocked'}
            </span>

            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1 font-semibold capitalize">
              <MapPin className="w-3.5 h-3.5 text-[var(--brand)]" />
              {zone.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Medallón Central Giratorio con Resplandor */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[var(--surface-solid)] p-1 shadow-[var(--shadow)] animate-marker-pulse">
                <div className="w-full h-full rounded-full bg-[var(--surface-solid)] flex items-center justify-center border-2 border-[var(--line-strong)]">
                  <Award className="w-12 h-12 text-[var(--brand)] animate-pokestop-float" />
                </div>
              </div>
            </div>

            <h3 className="font-black text-xl text-center text-[var(--ink)] mt-4 tracking-tight drop-shadow">
              {badgeName}
            </h3>
            <p className="text-xs font-semibold text-[var(--brand)] text-center mt-0.5">
              {title}
            </p>
          </div>

          {/* Descripción del Patrimonio */}
          <div className="bg-[var(--surface)] p-3.5 rounded-2xl border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed shadow-inner">
            <p>{description}</p>
          </div>

          {/* Sello Oficial y Botón de Recolección */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--line)]">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--ok-ink)] font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[var(--ok-ink)]" />
              <span>{language === 'es' ? 'Sellado en tu Pasaporte' : 'Stamped in Passport'}</span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] font-black text-xs rounded-xl shadow-[var(--shadow)] transition active:scale-95"
            >
              {language === 'es' ? 'Guardar Insignia' : 'Collect Badge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
