import { useState, useEffect, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { ArtisansPortal } from '../../components/ArtisansPortal';
import {
  Compass,
  ArrowLeft,
  KeyRound,
  Sparkles,
  Lock,
  Store,
  LogOut
} from 'lucide-react';
import { useRouter } from '../../router/Router';
import { tacticalAudio } from '../../utils/tacticalAudio';

interface ArtisanViewProps {
  pois: POI[];
  language: Language;
  onSessionChange?: () => void;
}

export const ArtisanView: FC<ArtisanViewProps> = ({ pois, language, onSessionChange }) => {
  const { navigate } = useRouter();

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
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#07154E] p-4 sm:p-6 pb-24 text-[#EFF1F8]">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Barra de Navegación Compacta */}
        <div className="flex items-center justify-between pb-3 border-b border-[#9597C1]/20 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#9597C1]">
              {language === 'es' ? 'Taller Seleccionado:' : 'Active Workshop:'}
            </span>
            {session && (
              <select
                value={session.poiId}
                onChange={(e) => {
                  const nextWorkshop = artisanPois.find((p) => p.id === e.target.value);
                  if (!nextWorkshop) return;
                  tacticalAudio.playTacticalClick();
                  const updatedSession = {
                    poiId: nextWorkshop.id,
                    workshopName: nextWorkshop.name,
                    artisanName: nextWorkshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
                    oficio: nextWorkshop.artisan_profile?.oficio || 'Artesanía'
                  };
                  localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(updatedSession));
                  setSession(updatedSession);
                  if (onSessionChange) onSessionChange();
                }}
                className="bg-[#0B228A] border border-[#9597C1]/30 rounded-xl px-2.5 py-1 text-xs text-[#EFF1F8] focus:outline-none focus:ring-1 focus:ring-[#EDE28E] cursor-pointer"
              >
                {artisanPois.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.zone.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  localStorage.removeItem('ruta_abierta_artisan_user');
                  setSession(null);
                  if (onSessionChange) onSessionChange();
                }}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#7B5E86]/30 hover:bg-[#7B5E86]/50 text-[#EFF1F8] border border-[#7B5E86]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'es' ? 'Cerrar sesión de taller' : 'Sign out'}
                aria-label={language === 'es' ? 'Cerrar sesión de taller' : 'Sign out'}
              >
                <LogOut className="w-3.5 h-3.5 text-[#EDE28E]" />
                <span className="hidden sm:inline">{language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl bg-[#0B228A] hover:bg-[#2544A7] text-[#EDE28E] border border-[#EDE28E]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <Compass className="w-3.5 h-3.5 text-[#EDE28E]" />
              <span>{language === 'es' ? 'Ver Mapa Turístico' : 'Tourist Map'}</span>
            </button>
          </div>
        </div>

        {/* Tarjeta de Inicio de Sesión si no hay sesión activa */}
        {!session ? (
          <div className="max-w-md mx-auto my-12 bg-[#0B228A] border border-[#9597C1]/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-slide">
            <div className="text-center space-y-1 pb-3 border-b border-[#9597C1]/20">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE28E]/15 text-[#EDE28E] border border-[#EDE28E]/30 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                {language === 'es' ? 'Acceso al Mostrador de Taller' : 'Workshop Counter Access'}
              </h3>
              <p className="text-xs text-[#9597C1]">
                {language === 'es'
                  ? 'Selecciona tu taller para comenzar a emitir sellos y recibir visitantes'
                  : 'Select your workshop to issue stamps and welcome visitors'}
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/40">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#EFF1F8] uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Taller Artesanal:' : 'Artisan Workshop:'}
                </label>
                <select
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                  className="w-full border border-[#9597C1]/30 rounded-xl p-2.5 text-xs text-[#EFF1F8] bg-[#07154E] focus:outline-none focus:ring-1 focus:ring-[#EDE28E]"
                >
                  {artisanPois.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.zone.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#EFF1F8] uppercase tracking-wider mb-1">
                  {language === 'es' ? 'PIN de Mostrador:' : 'Counter PIN:'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full border border-[#9597C1]/30 rounded-xl p-2.5 pl-8 text-xs text-[#EFF1F8] bg-[#07154E] font-mono tracking-widest placeholder:text-[#9597C1]/50 focus:outline-none focus:ring-1 focus:ring-[#EDE28E]"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-[#9597C1] absolute left-2.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#EDE28E] hover:bg-[#F4ECA6] text-[#0E2C9C] font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Abrir Mostrador' : 'Open Counter'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 rounded-xl bg-[#EDE28E]/15 hover:bg-[#EDE28E]/25 text-[#EDE28E] border border-[#EDE28E]/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#EDE28E]" />
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
          />
        )}
      </div>
    </div>
  );
};
export default ArtisanView;
