import { useState, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import {
  Store,
  BarChart3,
  Lock,
  KeyRound,
  X,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';
import { useRouter } from '../router/Router';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pois: POI[];
  language: Language;
  onSessionChange?: () => void;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onClose,
  pois,
  language,
  onSessionChange
}) => {
  const { navigate } = useRouter();
  const [authRole, setAuthRole] = useState<'artisan' | 'admin'>('artisan');

  // Talleres disponibles para login de artesano
  const artisanPois = pois.filter((p) => p.is_local_business && p.artisan_profile);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(
    artisanPois[0]?.id || ''
  );
  const [artisanPin, setArtisanPin] = useState<string>('');
  const [adminKey, setAdminKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verificar sesiones activas
  const activeArtisanUser = typeof window !== 'undefined'
    ? localStorage.getItem('ruta_abierta_artisan_user')
    : null;
  const activeAdminUser = typeof window !== 'undefined'
    ? localStorage.getItem('ruta_abierta_admin_user')
    : null;

  if (!isOpen) return null;

  const handleQuickDemoArtisan = () => {
    tacticalAudio.playTacticalClick();
    const workshop = artisanPois.find((p) => p.id === selectedWorkshopId) || artisanPois[0];
    if (!workshop) return;
    const session = {
      poiId: workshop.id,
      workshopName: workshop.name,
      artisanName: workshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
      oficio: workshop.artisan_profile?.oficio || 'Artesanía',
      role: 'artisan'
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/taller');
  };

  const handleArtisanLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artisanPin || artisanPin.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Ingresa un PIN válido (ej. 1234)' : 'Enter valid PIN (e.g. 1234)');
      return;
    }
    const workshop = artisanPois.find((p) => p.id === selectedWorkshopId) || artisanPois[0];
    if (!workshop) return;
    const session = {
      poiId: workshop.id,
      workshopName: workshop.name,
      artisanName: workshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
      oficio: workshop.artisan_profile?.oficio || 'Artesanía',
      role: 'artisan'
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/taller');
  };

  const handleQuickDemoAdmin = () => {
    tacticalAudio.playTacticalClick();
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano y Territorial'
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/admin');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey || adminKey.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Ingresa la clave institucional' : 'Enter institutional key');
      return;
    }
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano'
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/admin');
  };

  const handleLogout = (role: 'artisan' | 'admin') => {
    tacticalAudio.playTacticalClick();
    if (role === 'artisan') {
      localStorage.removeItem('ruta_abierta_artisan_user');
    } else {
      localStorage.removeItem('ruta_abierta_admin_user');
    }
    if (onSessionChange) onSessionChange();
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-slide">
      <div className="bg-slate-900 border border-white/10 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
              {language === 'es' ? 'Acceso a Gestión y Talleres' : 'Portal Login'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Rol a Autenticar */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setAuthRole('artisan');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
              authRole === 'artisan'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Maestro Artesano' : 'Artisan'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setAuthRole('admin');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
              authRole === 'admin'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Gobierno SECIHTI' : 'Admin SECIHTI'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
            {errorMsg}
          </div>
        )}

        {/* FORMULARIO 1: ARTESANO */}
        {authRole === 'artisan' && (
          <div className="space-y-3.5 animate-fade-slide">
            {activeArtisanUser ? (
              <div className="bg-sky-950/40 p-4 rounded-2xl border border-sky-500/30 space-y-3">
                <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'es' ? 'Sesión de Taller Activa' : 'Active Workshop Session'}</span>
                </div>
                <div className="text-xs text-slate-200">
                  <div className="font-extrabold text-sm text-white">
                    {JSON.parse(activeArtisanUser).workshopName}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {JSON.parse(activeArtisanUser).artisanName} • {JSON.parse(activeArtisanUser).oficio}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/taller');
                    }}
                    className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ir al Portal' : 'Open Portal'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogout('artisan')}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    title={language === 'es' ? 'Cerrar sesión' : 'Log out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleArtisanLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Selecciona tu Taller:' : 'Select Workshop:'}
                  </label>
                  <select
                    value={selectedWorkshopId}
                    onChange={(e) => setSelectedWorkshopId(e.target.value)}
                    className="w-full border border-white/15 rounded-xl p-2.5 text-xs text-white bg-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {artisanPois.map((poi) => (
                      <option key={poi.id} value={poi.id}>
                        {poi.name} ({poi.zone.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'PIN del Taller:' : 'Workshop PIN:'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={6}
                      value={artisanPin}
                      onChange={(e) => setArtisanPin(e.target.value)}
                      placeholder="1234"
                      className="w-full border border-white/15 rounded-xl p-2.5 pl-8 text-xs text-white bg-slate-950 font-mono tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Iniciar Sesión en Taller' : 'Workshop Login'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemoArtisan}
                    className="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {language === 'es'
                        ? 'Acceso Rápido Demo (1 Clic)'
                        : 'Quick 1-Click Demo Login'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* FORMULARIO 2: GOBIERNO / SECIHTI */}
        {authRole === 'admin' && (
          <div className="space-y-3.5 animate-fade-slide">
            {activeAdminUser ? (
              <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'es' ? 'Sesión de Administrador Activa' : 'Active Admin Session'}</span>
                </div>
                <div className="text-xs text-slate-200">
                  <div className="font-extrabold text-sm text-white">
                    {JSON.parse(activeAdminUser).institution}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {JSON.parse(activeAdminUser).user}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/admin');
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ir al Panel SECIHTI' : 'Open SECIHTI Panel'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogout('admin')}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    title={language === 'es' ? 'Cerrar sesión' : 'Log out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Clave de Acceso Institucional:' : 'Institutional Key:'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="SECIHTI-PUEBLA-2026"
                      className="w-full border border-white/15 rounded-xl p-2.5 pl-8 text-xs text-white bg-slate-950 font-mono tracking-wider placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Acceder al Panel' : 'Access Panel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemoAdmin}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {language === 'es'
                        ? 'Acceso Demostración SECIHTI (1 Clic)'
                        : 'Quick 1-Click SECIHTI Demo'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
