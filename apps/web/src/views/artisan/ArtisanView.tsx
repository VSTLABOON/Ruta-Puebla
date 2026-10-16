import { useState, useEffect, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { ArtisansPortal } from '../../components/ArtisansPortal';
import {
  KeyRound,
  Sparkles,
  Lock,
  Store
} from 'lucide-react';
import { tacticalAudio } from '../../utils/tacticalAudio';

interface ArtisanViewProps {
  pois: POI[];
  language: Language;
  onSessionChange?: () => void;
}

export const ArtisanView: FC<ArtisanViewProps> = ({ pois, language, onSessionChange }) => {

  const [session, setSession] = useState<{
    poiId: string;
    workshopName: string;
    artisanName: string;
    oficio: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_artisan_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const artisanPois = pois.filter((p) => p.is_local_business && p.artisan_profile);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(artisanPois[0]?.id || '');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_artisan_user');
      if (saved) setSession(JSON.parse(saved));
    } catch {}
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Ingresa el PIN de 4 dígitos' : 'Enter 4-digit PIN');
      return;
    }
    const workshop = artisanPois.find((p) => p.id === selectedWorkshopId) || artisanPois[0];
    if (!workshop) return;
    const newSession = {
      poiId: workshop.id,
      workshopName: workshop.name,
      artisanName: workshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
      oficio: workshop.artisan_profile?.oficio || 'Artesanía'
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(newSession));
    setSession(newSession);
    setErrorMsg(null);
    if (onSessionChange) onSessionChange();
  };

  const handleQuickDemo = () => {
    tacticalAudio.playTacticalClick();
    const workshop = artisanPois.find((p) => p.id === selectedWorkshopId) || artisanPois[0];
    if (!workshop) return;
    const newSession = {
      poiId: workshop.id,
      workshopName: workshop.name,
      artisanName: workshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
      oficio: workshop.artisan_profile?.oficio || 'Artesanía'
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(newSession));
    setSession(newSession);
    setErrorMsg(null);
    if (onSessionChange) onSessionChange();
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto talavera-bg-pattern p-4 sm:p-6 pb-24 text-[#162035]">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Tarjeta de Inicio de Sesión si no hay sesión activa */}
        {!session ? (
          <div className="max-w-md mx-auto my-12 bg-[#FAF6EE] border-4 border-[#0F3078] rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-slide">
            <div className="text-center space-y-1 pb-3 border-b-2 border-[#0F3078]/15">
              <div className="w-12 h-12 rounded-2xl bg-[#0F3078] text-[#FAF6EE] flex items-center justify-center mx-auto mb-2 shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-black text-base text-[#0F3078]">
                {language === 'es' ? 'Acceso al Mostrador de Taller' : 'Workshop Counter Access'}
              </h3>
              <p className="text-xs text-[#0F3078]/70 font-sans">
                {language === 'es'
                  ? 'Selecciona tu taller para comenzar a emitir sellos y recibir visitantes'
                  : 'Select your workshop to issue stamps and welcome visitors'}
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-800 bg-rose-100 p-2.5 rounded-xl border border-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-serif font-bold text-[#0F3078] uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Taller Artesanal:' : 'Artisan Workshop:'}
                </label>
                <select
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                  className="w-full border-2 border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                >
                  {artisanPois.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.zone.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-serif font-bold text-[#0F3078] uppercase tracking-wider mb-1">
                  {language === 'es' ? 'PIN de Mostrador:' : 'Counter PIN:'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full border-2 border-[#0F3078]/25 rounded-xl p-2.5 pl-8 text-xs text-[#162035] bg-white font-mono tracking-widest placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-[#0F3078]/50 absolute left-2.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#0A2255] text-[#FAF6EE] font-serif font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md border border-[#FAF6EE]/20"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Abrir Mostrador' : 'Open Counter'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#B84A2C] border-2 border-[#B84A2C]/30 font-serif font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B84A2C]" />
                <span>{language === 'es' ? 'Acceso Rápido Demo (1 Clic)' : 'Quick Demo Access'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* Panel Operativo de Mostrador */
          <ArtisansPortal
            pois={pois}
            language={language}
            activePoiId={session.poiId}
            onSelectWorkshop={(newPoiId) => {
              const workshop = artisanPois.find((p) => p.id === newPoiId);
              if (!workshop) return;
              tacticalAudio.playTacticalClick();
              const updatedSession = {
                poiId: workshop.id,
                workshopName: workshop.name,
                artisanName: workshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
                oficio: workshop.artisan_profile?.oficio || 'Artesanía'
              };
              localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(updatedSession));
              setSession(updatedSession);
              if (onSessionChange) onSessionChange();
            }}
          />
        )}
      </div>
    </div>
  );
};
export default ArtisanView;
