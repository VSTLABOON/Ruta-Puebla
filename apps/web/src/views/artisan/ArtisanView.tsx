import { useState, useEffect, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { ArtisansPortal } from '../../components/ArtisansPortal';
import {
  Store,
  Compass,
  ArrowLeft,
  LogOut,
  KeyRound,
  Sparkles,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { useRouter } from '../../router/Router';
import { tacticalAudio } from '../../utils/tacticalAudio';

interface ArtisanViewProps {
  pois: POI[];
  language: Language;
}

export const ArtisanView: FC<ArtisanViewProps> = ({ pois, language }) => {
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
  };

  const handleLogout = () => {
    tacticalAudio.playTacticalClick();
    localStorage.removeItem('ruta_abierta_artisan_user');
    setSession(null);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 pb-24 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Barra superior del portal de artesanos */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {language === 'es' ? 'Portal del Artesano y Comercio Tradicional' : 'Artisans & Local Commerce Portal'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Gestión de hornos, demostraciones en vivo y sellado de pasaporte en barrios de Puebla'
                  : 'Manage workshops, demonstrations, and passport stamps'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'es' ? 'Cerrar sesión de taller' : 'Log out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'es' ? 'Cerrar Sesión' : 'Logout'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <Compass className="w-4 h-4 text-amber-400" />
              <span>{language === 'es' ? 'Volver al Mapa' : 'Back to Map'}</span>
            </button>
          </div>
        </div>

        {/* Si no ha iniciado sesión, mostrar tarjeta de Login */}
        {!session ? (
          <div className="max-w-md mx-auto my-8 bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-slide">
            <div className="text-center space-y-1 pb-3 border-b border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                {language === 'es' ? 'Acceso para Maestros Artesanos' : 'Master Artisan Login'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Identifica tu taller para activar demostraciones y otorgar sellos'
                  : 'Identify your workshop to activate live demos and grant stamps'}
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Taller Tradicional:' : 'Traditional Workshop:'}
                </label>
                <select
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                  className="w-full border border-white/15 rounded-xl p-2.5 text-xs text-white bg-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {artisanPois.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.zone.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'PIN de Acceso:' : 'Workshop PIN:'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full border border-white/15 rounded-xl p-2.5 pl-8 text-xs text-white bg-slate-950 font-mono tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Entrar a Mi Taller' : 'Enter My Workshop'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === 'es'
                    ? 'Acceso Rápido Demo (1 Clic)'
                    : 'Quick 1-Click Demo Login'}
                </span>
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Banner de Taller Activo */}
            <div className="bg-sky-950/40 border border-sky-500/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-sky-400 font-bold block">
                    {language === 'es' ? 'Taller Autenticado:' : 'Logged In Workshop:'}
                  </span>
                  <span className="font-extrabold text-sm text-white">
                    {session.workshopName}
                  </span>
                  <span className="text-xs text-slate-300 ml-2">
                    ({session.artisanName} • {session.oficio})
                  </span>
                </div>
              </div>
            </div>

            {/* Panel Principal de Artesanos */}
            <ArtisansPortal pois={pois} language={language} />
          </div>
        )}
      </div>
    </div>
  );
};
export default ArtisanView;
