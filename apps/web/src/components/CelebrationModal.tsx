import { useEffect, useRef, type FC } from 'react';
import { CheckCircle2, Sparkles, X, MapPin } from 'lucide-react';
import { Language } from '@ruta-abierta/shared-types';
import { TalaveraPlateMedallion } from './TalaveraOrnament';

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

    const colors = ['#0F3078', '#B84A2C', '#F0B43A', '#1D6B52', '#FAF6EE', '#6D438A'];
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
    <div className="fixed inset-0 z-50 bg-[#162035]/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      {/* Canvas de partículas de celebración de Talavera */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Contenedor de la Tarjeta de Talavera Coleccionable */}
      <div className="relative z-20 max-w-sm w-full animate-in zoom-in-90 duration-300">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-[#FAF6EE] hover:text-[#F0B43A] rounded-full bg-[#0F3078] border border-[#FAF6EE]/30 transition shadow-md"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tarjeta de Talavera Poblana */}
        <div className="bg-[#FAF6EE] border-4 border-[#0F3078] rounded-3xl p-6 text-[#162035] shadow-2xl space-y-5">
          {/* Cabecera de Insignia */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0F3078] text-[#FAF6EE] text-[10px] font-serif font-black uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#F0B43A]" />
              {language === 'es' ? 'Secreto Desbloqueado' : 'Secret Unlocked'}
            </span>

            <span className="text-[11px] text-[#0F3078] flex items-center gap-1 font-serif font-bold capitalize">
              <MapPin className="w-3.5 h-3.5 text-[#B84A2C]" />
              {zone.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Medallón Central de Cerámica Talavera */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative flex items-center justify-center mb-2">
              <TalaveraPlateMedallion size="xl" variant="polychrome" animate={true} />
            </div>

            <h3 className="font-serif font-black text-xl text-center text-[#0F3078] mt-2 tracking-tight">
              {badgeName}
            </h3>
            <p className="text-xs font-serif font-bold text-[#B84A2C] text-center mt-0.5">
              {title}
            </p>
          </div>

          {/* Descripción del Patrimonio */}
          <div className="bg-white/95 p-3.5 rounded-2xl border-2 border-[#0F3078]/15 text-xs text-[#162035]/80 leading-relaxed shadow-xs">
            <p>{description}</p>
          </div>

          {/* Sello Oficial y Botón de Recolección */}
          <div className="pt-2 flex items-center justify-between border-t-2 border-[#0F3078]/15">
            <div className="flex items-center gap-1.5 text-[11px] text-[#1D6B52] font-serif font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#1D6B52]" />
              <span>{language === 'es' ? 'Sellado en tu Pasaporte' : 'Stamped in Passport'}</span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0F3078] hover:bg-[#0A2255] text-[#FAF6EE] font-serif font-black text-xs rounded-xl shadow-md border border-[#FAF6EE]/20 transition active:scale-95 cursor-pointer"
            >
              {language === 'es' ? 'Guardar Placa' : 'Collect Plate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
