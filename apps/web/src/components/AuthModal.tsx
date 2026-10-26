import { useState, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import {
  Store,
  BarChart3,
  KeyRound,
  X,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  User,
  UserPlus,
  Trophy,
  Mail
} from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';
import { useRouter } from '../router/Router';
import { UserProfile } from '../types/userRecord';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pois: POI[];
  language: Language;
  onSessionChange?: () => void;
  onOpenRecord?: () => void;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onClose,
  pois,
  language,
  onSessionChange,
  onOpenRecord
}) => {
  const { navigate } = useRouter();
  const [authRole, setAuthRole] = useState<'tourist' | 'artisan' | 'admin'>('tourist');
  const [touristMode, setTouristMode] = useState<'login' | 'register'>('login');

  // Formulario Visitante - Login
  const [touristEmail, setTouristEmail] = useState('');
  const [touristPin, setTouristPin] = useState('');
  const [touristRememberMe, setTouristRememberMe] = useState(true);

  // Formulario Visitante - Registro
  const [regName, setRegName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regMobility, setRegMobility] = useState<
    'sin_restriccion' | 'movilidad_reducida' | 'silla_de_ruedas'
  >('sin_restriccion');

  // Formulario Artesano
  const artisanPois = pois.filter((p) => p.is_local_business && p.artisan_profile);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(
    artisanPois[0]?.id || ''
  );
  const [artisanPin, setArtisanPin] = useState<string>('');

  // Formulario Admin
  const [adminKey, setAdminKey] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeTouristUser: UserProfile | null =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const s = localStorage.getItem('ruta_abierta_tourist_user');
            return s ? JSON.parse(s) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const activeArtisanUser =
    typeof window !== 'undefined' ? localStorage.getItem('ruta_abierta_artisan_user') : null;
  const activeAdminUser =
    typeof window !== 'undefined' ? localStorage.getItem('ruta_abierta_admin_user') : null;

  if (!isOpen) return null;

  // --- Handlers para Visitante ---
  const handleQuickDemoTourist = () => {
    tacticalAudio.playTacticalClick();
    const demoUser: UserProfile = {
      id: 'tourist_demo_01',
      name: 'Elena García Méndez',
      nickname: 'Caminante de Analco',
      email: 'elena.exploradora@puebla.mx',
      role: 'tourist',
      mobilityProfile: 'sin_restriccion',
      level: 3,
      xp: 1450,
      createdAt: '2026-10-01',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(demoUser));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/');
  };

  const handleTouristLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!touristEmail.trim() || !touristPin.trim()) {
      setErrorMsg(
        language === 'es'
          ? 'Ingresa tu correo o usuario y tu contraseña'
          : 'Enter your email/username and password'
      );
      return;
    }

    let existingUsers: UserProfile[] = [];
    try {
      const saved = localStorage.getItem('ruta_abierta_registered_tourists');
      if (saved) existingUsers = JSON.parse(saved);
    } catch {}

    const found = existingUsers.find(
      (u) =>
        u.email?.toLowerCase() === touristEmail.trim().toLowerCase() ||
        u.nickname.toLowerCase() === touristEmail.trim().toLowerCase()
    );

    const activeProfile: UserProfile = found || {
      id: `tourist_${Date.now()}`,
      name: touristEmail.split('@')[0] || 'Visitante',
      nickname: touristEmail.split('@')[0] || 'Caminante',
      email: touristEmail.trim(),
      role: 'tourist',
      mobilityProfile: 'sin_restriccion',
      level: 2,
      xp: 850,
      createdAt: new Date().toISOString().slice(0, 10),
      rememberMe: touristRememberMe
    };

    localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(activeProfile));
    tacticalAudio.playStampSuccess();
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/');
  };

  const handleTouristRegister = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regName.trim() || !regNickname.trim() || regPin.trim().length < 4) {
      setErrorMsg(
        language === 'es'
          ? 'Completa tu nombre, alias y un PIN de al menos 4 dígitos'
          : 'Complete your name, nickname and a 4+ digit PIN'
      );
      return;
    }

    const newProfile: UserProfile = {
      id: `tourist_${Date.now()}`,
      name: regName.trim(),
      nickname: regNickname.trim(),
      email: `${regNickname.toLowerCase().replace(/\s+/g, '')}@puebla.mx`,
      role: 'tourist',
      mobilityProfile: regMobility,
      level: 1,
      xp: 200,
      createdAt: new Date().toISOString().slice(0, 10),
      rememberMe: true
    };

    try {
      const saved = localStorage.getItem('ruta_abierta_registered_tourists');
      const list: UserProfile[] = saved ? JSON.parse(saved) : [];
      list.push(newProfile);
      localStorage.setItem('ruta_abierta_registered_tourists', JSON.stringify(list));
    } catch {}

    localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(newProfile));
    tacticalAudio.playStampSuccess();
    setSuccessMsg(
      language === 'es'
        ? '¡Cuenta creada! Tu progreso ha quedado activo.'
        : 'Account created! Your progress is now active.'
    );
    if (onSessionChange) onSessionChange();
    setTimeout(() => {
      onClose();
      navigate('/');
    }, 650);
  };

  // --- Handlers para Artesano ---
  const handleQuickDemoArtisan = () => {
    tacticalAudio.playTacticalClick();
    const firstWorkshop = artisanPois[0];
    const session = {
      poiId: firstWorkshop?.id || 'poi_05',
      workshopName: firstWorkshop?.name || 'Talavera Celia (Sala de Exposición)',
      artisanName: firstWorkshop?.artisan_profile?.maestro_artesano || 'Maestra Celia',
      oficio: firstWorkshop?.artisan_profile?.oficio || 'Talavera Poblana Certificada',
      role: 'artisan',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/taller');
  };

  const handleArtisanLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!artisanPin || artisanPin.trim().length < 4) {
      setErrorMsg(
        language === 'es' ? 'Ingresa un PIN válido (ej. 1234)' : 'Enter valid PIN (e.g. 1234)'
      );
      return;
    }
    const workshop = artisanPois.find((p) => p.id === selectedWorkshopId) || artisanPois[0];
    if (!workshop) return;
    const session = {
      poiId: workshop.id,
      workshopName: workshop.name,
      artisanName: workshop.artisan_profile?.maestro_artesano || 'Maestro Artesano',
      oficio: workshop.artisan_profile?.oficio || 'Artesanía',
      role: 'artisan',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/taller');
  };

  // --- Handlers para Gobierno ---
  const handleQuickDemoAdmin = () => {
    tacticalAudio.playTacticalClick();
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano y Territorial',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/admin');
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminKey || adminKey.trim().length < 4) {
      setErrorMsg(
        language === 'es' ? 'Ingresa la clave institucional' : 'Enter institutional key'
      );
      return;
    }
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/admin');
  };

  const handleLogout = (role: 'tourist' | 'artisan' | 'admin') => {
    tacticalAudio.playTacticalClick();
    if (role === 'tourist') {
      localStorage.removeItem('ruta_abierta_tourist_user');
    } else if (role === 'artisan') {
      localStorage.removeItem('ruta_abierta_artisan_user');
    } else {
      localStorage.removeItem('ruta_abierta_admin_user');
    }
    if (onSessionChange) onSessionChange();
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1E4A]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-slide">
      <div className="bg-[#FAF6EE] border-t-4 sm:border-4 border-[#0F3078] text-[#162035] rounded-t-[28px] sm:rounded-3xl max-w-md w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* 1. Cabecera Fija */}
        <header className="px-5 py-3.5 bg-[#0F3078] text-[#FAF6EE] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#F0B43A]" />
            </div>
            <div>
              <h3 className="font-serif font-black text-sm sm:text-base text-[#FAF6EE]">
                {language === 'es' ? 'Mi Cuenta' : 'My Account'}
              </h3>
              <p className="text-[11px] text-[#DCE6F9]">
                {authRole === 'tourist'
                  ? language === 'es'
                    ? 'Acceso para visitantes y caminantes'
                    : 'Visitor and walker access'
                  : authRole === 'artisan'
                  ? language === 'es'
                    ? 'Acceso para talleres artesanales'
                    : 'Artisan workshop access'
                  : language === 'es'
                  ? 'Acceso institucional SECIHTI'
                  : 'Institutional access'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer"
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Cuerpo con Scroll Propio */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="text-xs text-[#B84A2C] bg-[#B84A2C]/10 p-3 rounded-xl border border-[#B84A2C]/30 font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-[#1D6B52] bg-[#1D6B52]/10 p-3 rounded-xl border border-[#1D6B52]/30 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ROL 1: VISITANTE (POR DEFECTO) */}
          {authRole === 'tourist' && (
            <div className="space-y-4">
              {activeTouristUser ? (
                <div className="bg-white p-4 rounded-2xl border border-[#0F3078]/15 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0F3078]">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#1D6B52]" />
                      <span>{language === 'es' ? 'Sesión activa' : 'Active session'}</span>
                    </div>
                    <span className="bg-[#0F3078] text-[#FAF6EE] px-2.5 py-0.5 rounded-full text-[10px]">
                      Nivel {activeTouristUser.level}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-sm text-[#162035]">{activeTouristUser.name}</div>
                    <div className="text-xs text-[#162035]/70 mt-0.5">
                      @{activeTouristUser.nickname} • {activeTouristUser.email || 'Visitante'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#0F3078]/10">
                    {onOpenRecord && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenRecord();
                        }}
                        className="flex-1 py-2.5 px-3 bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{language === 'es' ? 'Ver mi progreso' : 'View progress'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleLogout('tourist')}
                      className="py-2.5 px-3 bg-[#B84A2C]/10 hover:bg-[#B84A2C]/20 text-[#B84A2C] font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Salir' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selector segmentado Iniciar sesión / Crear cuenta */}
                  <div className="grid grid-cols-2 gap-1 bg-[#F2EBDC] p-1 rounded-xl border border-[#0F3078]/15 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setTouristMode('login');
                        setErrorMsg(null);
                      }}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        touristMode === 'login'
                          ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                          : 'text-[#0F3078]/75 hover:text-[#0F3078]'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Iniciar sesión' : 'Sign in'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTouristMode('register');
                        setErrorMsg(null);
                      }}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        touristMode === 'register'
                          ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                          : 'text-[#0F3078]/75 hover:text-[#0F3078]'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Crear cuenta' : 'Create account'}</span>
                    </button>
                  </div>

                  {touristMode === 'login' ? (
                    <form id="auth-modal-form" onSubmit={handleTouristLogin} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#0F3078] mb-1">
                          {language === 'es' ? 'Correo o usuario' : 'Email or username'}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={touristEmail}
                            onChange={(e) => setTouristEmail(e.target.value)}
                            placeholder="elena.exploradora@puebla.mx"
                            className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 pl-8 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                          />
                          <Mail className="w-3.5 h-3.5 text-[#0F3078]/60 absolute left-2.5 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#0F3078] mb-1">
                          {language === 'es' ? 'Contraseña o PIN' : 'Password or PIN'}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={touristPin}
                            onChange={(e) => setTouristPin(e.target.value)}
                            placeholder="••••"
                            className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 pl-8 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                          />
                          <KeyRound className="w-3.5 h-3.5 text-[#0F3078]/60 absolute left-2.5 top-3" />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-[#162035]/80 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={touristRememberMe}
                          onChange={(e) => setTouristRememberMe(e.target.checked)}
                          className="rounded border-[#0F3078]/30 text-[#0F3078]"
                        />
                        <span>
                          {language === 'es' ? 'Mantener sesión iniciada' : 'Keep me signed in'}
                        </span>
                      </label>
                    </form>
                  ) : (
                    <form id="auth-modal-form" onSubmit={handleTouristRegister} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#0F3078] mb-1">
                          {language === 'es' ? 'Nombre completo' : 'Full name'}
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Carlos Mendoza"
                          className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-[#0F3078] mb-1">
                            {language === 'es' ? 'Usuario o alias' : 'Username'}
                          </label>
                          <input
                            type="text"
                            value={regNickname}
                            onChange={(e) => setRegNickname(e.target.value)}
                            placeholder="Caminante"
                            className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#0F3078] mb-1">
                            {language === 'es' ? 'PIN (4 dígitos)' : 'PIN (4 digits)'}
                          </label>
                          <input
                            type="password"
                            value={regPin}
                            onChange={(e) => setRegPin(e.target.value)}
                            placeholder="1234"
                            maxLength={8}
                            className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#0F3078] mb-1">
                          {language === 'es' ? 'Preferencia al caminar' : 'Walking preference'}
                        </label>
                        <select
                          value={regMobility}
                          onChange={(e) => setRegMobility(e.target.value as any)}
                          className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                        >
                          <option value="sin_restriccion">
                            {language === 'es' ? 'Caminata estándar' : 'Standard walk'}
                          </option>
                          <option value="movilidad_reducida">
                            {language === 'es'
                              ? 'Paso tranquilo / Sin pendientes fuertes'
                              : 'Reduced mobility / Gentle slopes'}
                          </option>
                          <option value="silla_de_ruedas">
                            {language === 'es'
                              ? 'Silla de ruedas o carriola (100% plano)'
                              : 'Wheelchair or stroller (step-free)'}
                          </option>
                        </select>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* ROL 2: TALLER ARTESANAL */}
          {authRole === 'artisan' && (
            <div className="space-y-3.5">
              {activeArtisanUser ? (
                <div className="bg-white p-4 rounded-2xl border border-[#0F3078]/15 space-y-3">
                  <div className="flex items-center gap-2 text-[#0F3078] text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-[#1D6B52]" />
                    <span>{language === 'es' ? 'Taller conectado' : 'Active workshop'}</span>
                  </div>
                  <div className="text-xs text-[#162035]">
                    <div className="font-bold text-sm">{JSON.parse(activeArtisanUser).workshopName}</div>
                    <div className="text-[#162035]/70 mt-0.5">
                      {JSON.parse(activeArtisanUser).artisanName} • {JSON.parse(activeArtisanUser).oficio}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#0F3078]/10">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/taller');
                      }}
                      className="flex-1 py-2.5 px-3 bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>{language === 'es' ? 'Ir a mi taller' : 'Go to workshop'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogout('artisan')}
                      className="py-2.5 px-3 bg-[#B84A2C]/10 hover:bg-[#B84A2C]/20 text-[#B84A2C] font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <form id="auth-modal-form" onSubmit={handleArtisanLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3078] mb-1">
                      {language === 'es' ? 'Selecciona tu taller' : 'Select your workshop'}
                    </label>
                    <select
                      value={selectedWorkshopId}
                      onChange={(e) => setSelectedWorkshopId(e.target.value)}
                      className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                    >
                      {artisanPois.map((poi) => (
                        <option key={poi.id} value={poi.id}>
                          {poi.name} ({poi.zone.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F3078] mb-1">
                      {language === 'es' ? 'PIN del taller' : 'Workshop PIN'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={artisanPin}
                        onChange={(e) => setArtisanPin(e.target.value)}
                        placeholder="1234"
                        className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 pl-8 text-xs text-[#162035] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-[#0F3078]/60 absolute left-2.5 top-3" />
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ROL 3: GOBIERNO */}
          {authRole === 'admin' && (
            <div className="space-y-3.5">
              {activeAdminUser ? (
                <div className="bg-white p-4 rounded-2xl border border-[#0F3078]/15 space-y-3">
                  <div className="flex items-center gap-2 text-[#0F3078] text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-[#1D6B52]" />
                    <span>{language === 'es' ? 'Sesión institucional activa' : 'Active session'}</span>
                  </div>
                  <div className="text-xs text-[#162035]">
                    <div className="font-bold text-sm">{JSON.parse(activeAdminUser).institution}</div>
                    <div className="text-[#162035]/70 mt-0.5">{JSON.parse(activeAdminUser).user}</div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#0F3078]/10">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/admin');
                      }}
                      className="flex-1 py-2.5 px-3 bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>{language === 'es' ? 'Abrir panel' : 'Open dashboard'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogout('admin')}
                      className="py-2.5 px-3 bg-[#B84A2C]/10 hover:bg-[#B84A2C]/20 text-[#B84A2C] font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <form id="auth-modal-form" onSubmit={handleAdminLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3078] mb-1">
                      {language === 'es' ? 'Clave de acceso institucional' : 'Institutional key'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        placeholder="SECIHTI-PUEBLA-2026"
                        className="w-full border border-[#0F3078]/25 rounded-xl p-2.5 pl-8 text-xs text-[#162035] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-[#0F3078]/60 absolute left-2.5 top-3" />
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Selector secundario discreto para cambiar entre Visitante / Taller / Gobierno */}
          <div className="pt-3 border-t border-[#0F3078]/10 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-[#162035]/60 font-medium">
              {language === 'es' ? 'Tipo de acceso:' : 'Access mode:'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAuthRole('tourist');
                  setErrorMsg(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  authRole === 'tourist'
                    ? 'bg-[#0F3078]/10 text-[#0F3078]'
                    : 'text-[#162035]/60 hover:text-[#0F3078]'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>{language === 'es' ? 'Visitante' : 'Visitor'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthRole('artisan');
                  setErrorMsg(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  authRole === 'artisan'
                    ? 'bg-[#0F3078]/10 text-[#0F3078]'
                    : 'text-[#162035]/60 hover:text-[#0F3078]'
                }`}
              >
                <Store className="w-3 h-3" />
                <span>{language === 'es' ? 'Taller' : 'Workshop'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthRole('admin');
                  setErrorMsg(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  authRole === 'admin'
                    ? 'bg-[#0F3078]/10 text-[#0F3078]'
                    : 'text-[#162035]/60 hover:text-[#0F3078]'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>{language === 'es' ? 'Gobierno' : 'Admin'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Footer Fijo con Acción Principal y Acceso Rápido de Prueba */}
        {((authRole === 'tourist' && !activeTouristUser) ||
          (authRole === 'artisan' && !activeArtisanUser) ||
          (authRole === 'admin' && !activeAdminUser)) && (
          <footer className="p-3.5 sm:px-5 bg-white border-t border-[#0F3078]/15 flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={
                authRole === 'tourist'
                  ? handleQuickDemoTourist
                  : authRole === 'artisan'
                  ? handleQuickDemoArtisan
                  : handleQuickDemoAdmin
              }
              className="py-2.5 px-3 rounded-xl bg-[#F2EBDC] hover:bg-[#E5DEC9] text-[#0F3078] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D48914]" />
              <span>{language === 'es' ? 'Acceso rápido' : 'Quick demo'}</span>
            </button>

            <button
              type="submit"
              form="auth-modal-form"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <span>
                {authRole === 'tourist'
                  ? touristMode === 'login'
                    ? language === 'es'
                      ? 'Iniciar sesión'
                      : 'Sign in'
                    : language === 'es'
                    ? 'Crear cuenta'
                    : 'Create account'
                  : language === 'es'
                  ? 'Entrar'
                  : 'Enter'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
export default AuthModal;
