import { useState, useRef, type MouseEvent, type TouchEvent, type FC } from 'react';
import { Award, Sparkles, Check, ShieldCheck, Flame } from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';

interface HolographicBadgeProps {
  badgeName: string;
  poiName: string;
  zone: string;
  secretTitle?: string;
  secretDescription?: string;
  isUnlocked: boolean;
  onUnlock?: () => void;
  language?: 'es' | 'en';
}

export const HolographicBadge: FC<HolographicBadgeProps> = ({
  badgeName,
  poiName,
  zone,
  secretTitle,
  secretDescription,
  isUnlocked,
  onUnlock,
  language = 'es'
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = Math.max(-15, Math.min(15, ((y - centerY) / centerY) * -12));
    const rotY = Math.max(-15, Math.min(15, ((x - centerX) / centerX) * 12));

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handleReset = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  const handleStamp = () => {
    if (!isUnlocked && onUnlock) {
      tacticalAudio.playStampSuccess();
      onUnlock();
    }
  };

  return (
    <div
      className="perspective-1000 py-2 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleReset}
      onTouchStart={() => setIsHovered(true)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleReset}
    >
      <div
        ref={cardRef}
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out'
        }}
        className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${
          isUnlocked
            ? 'holographic-card border-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
            : 'bg-slate-900/90 border-slate-700/80 shadow-xl'
        }`}
      >
        {/* Iridescent Glare Sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.35) 0%, rgba(56,189,248,0.2) 35%, rgba(245,158,11,0.15) 60%, transparent 80%)`
          }}
        />

        {/* Tactical Stencil Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

        {/* Card Header Telemetry */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10 text-xs">
          <div className="flex items-center gap-1.5 font-mono uppercase tracking-widest text-[10px] text-amber-400 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{language === 'es' ? 'Sello Patrimonial' : 'Heritage Stamp'}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 uppercase px-2 py-0.5 rounded bg-slate-950/60 border border-white/5">
            {zone.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Central Medallion Badge */}
        <div className="relative z-10 my-4 flex flex-col items-center text-center">
          <div className="relative mb-3">
            {/* Glowing Aura Ring */}
            <div
              className={`absolute -inset-2 rounded-full blur-md opacity-75 ${
                isUnlocked
                  ? 'bg-gradient-to-r from-amber-500 via-sky-400 to-amber-500 animate-pulse'
                  : 'bg-slate-700'
              }`}
            />

            {/* Medallion Core */}
            <div
              className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-300 ${
                isUnlocked
                  ? 'bg-gradient-to-br from-amber-400 via-amber-600 to-slate-950 border-amber-300 text-slate-950'
                  : 'bg-slate-950 border-slate-700 text-slate-500'
              }`}
            >
              {isUnlocked ? (
                <Award className="w-10 h-10 text-amber-200 stroke-[2.2] drop-shadow-md" />
              ) : (
                <Award className="w-9 h-9 text-slate-600 stroke-[1.8]" />
              )}
            </div>

            {/* Verification Chip */}
            <div
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-950 flex items-center justify-center ${
                isUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {isUnlocked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <ShieldCheck className="w-3 h-3" />}
            </div>
          </div>

          <h4 className="text-base font-extrabold tracking-tight text-white mb-0.5">
            {badgeName}
          </h4>
          <p className="text-xs text-amber-300/90 font-medium">
            {poiName}
          </p>
        </div>

        {/* Secret / Memory Information */}
        {secretTitle && (
          <div className="relative z-10 bg-slate-950/70 backdrop-blur-md rounded-xl p-3 border border-white/10 text-xs space-y-1 my-3 text-left">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{secretTitle}</span>
            </div>
            {secretDescription && (
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {secretDescription}
              </p>
            )}
          </div>
        )}

        {/* Bottom Interactive Stamp Button */}
        <div className="relative z-10 pt-2 border-t border-white/10">
          {isUnlocked ? (
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span>{language === 'es' ? 'Sello Registrado en Pasaporte' : 'Registered in Passport'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStamp}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{language === 'es' ? 'Sellar Insignia en Pasaporte' : 'Stamp Badge into Passport'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
