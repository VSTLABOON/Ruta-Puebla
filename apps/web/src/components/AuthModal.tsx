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

  // Formulario Turista - Login
  const [touristEmail, setTouristEmail] = useState('');
  const [touristPin, setTouristPin] = useState('');
  const [touristRememberMe, setTouristRememberMe] = useState(true);

  // Formulario Turista - Registro
  const [regName, setRegName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regMobility, setRegMobility] = useState<'sin_restriccion' | 'movilidad_reducida' | 'silla_de_ruedas'>('sin_restriccion');

  // Formulario Artesano
  const artisanPois = pois.filter((p) => p.is_local_business && p.artisan_profile);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(
    artisanPois[0]?.id || ''
  );
  const [artisanPin, setArtisanPin] = useState<string>('');
  const [artisanRememberMe, setArtisanRememberMe] = useState(true);

  // Formulario Admin
  const [adminKey, setAdminKey] = useState<string>('');
  const [adminRememberMe, setAdminRememberMe] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sesiones activas desde localStorage
  const activeTouristUser: UserProfile | null = typeof window !== 'undefined'
    ? (() => {
        try {
          const s = localStorage.getItem('ruta_abierta_tourist_user');
          return s ? JSON.parse(s) : null;
        } catch {
          return null;
        }
      })()
    : null;

  const activeArtisanUser = typeof window !== 'undefined'
    ? localStorage.getItem('ruta_abierta_artisan_user')
    : null;
  const activeAdminUser = typeof window !== 'undefined'
    ? localStorage.getItem('ruta_abierta_admin_user')
    : null;

  if (!isOpen) return null;

  // --- Handlers para Turista / Explorador ---
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
      xp: 380,
      createdAt: '2026-10-12',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(demoUser));
    if (onSessionChange) onSessionChange();
    setSuccessMsg(language === 'es' ? '¡Bienvenida, Elena! Sesión iniciada.' : 'Welcome, Elena! Logged in.');
    setTimeout(() => {
      onClose();
      if (onOpenRecord) onOpenRecord();
    }, 600);
  };

  const handleTouristLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!touristEmail || touristEmail.trim().length < 3) {
      setErrorMsg(language === 'es' ? 'Ingresa tu usuario o correo' : 'Enter username or email');
      return;
    }
    if (!touristPin || touristPin.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'El PIN debe tener al menos 4 dígitos' : 'PIN must be at least 4 digits');
      return;
    }

    tacticalAudio.playTacticalClick();
    const cleanNick = touristEmail.includes('@') ? touristEmail.split('@')[0] : touristEmail;
    const user: UserProfile = {
      id: `tourist_${Date.now()}`,
      name: cleanNick.charAt(0).toUpperCase() + cleanNick.slice(1),
      nickname: cleanNick,
      email: touristEmail,
      role: 'tourist',
      mobilityProfile: 'sin_restriccion',
      level: 1,
      xp: 120,
      createdAt: new Date().toISOString().slice(0, 10),
      rememberMe: touristRememberMe
    };

    localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(user));
    if (onSessionChange) onSessionChange();
    setSuccessMsg(language === 'es' ? `¡Bienvenido de vuelta, ${user.name}!` : `Welcome back, ${user.name}!`);
    setTimeout(() => {
      onClose();
      if (onOpenRecord) onOpenRecord();
    }, 600);
  };

  const handleTouristRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || regName.trim().length < 3) {
      setErrorMsg(language === 'es' ? 'Ingresa tu nombre completo' : 'Enter your full name');
      return;
    }
    if (!regPin || regPin.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Elige un PIN de al menos 4 dígitos' : 'Choose a PIN of at least 4 digits');
      return;
    }

    tacticalAudio.playStampSuccess();
    const user: UserProfile = {
      id: `tourist_${Date.now()}`,
      name: regName.trim(),
      nickname: regNickname.trim() || regName.trim().split(' ')[0],
      email: regEmail.trim() || undefined,
      role: 'tourist',
      mobilityProfile: regMobility,
      level: 1,
      xp: 100,
      createdAt: new Date().toISOString().slice(0, 10),
      rememberMe: touristRememberMe
    };

    localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(user));
    if (onSessionChange) onSessionChange();
    setSuccessMsg(language === 'es' ? '¡Cuenta creada con éxito! Bienvenido a Puebla.' : 'Account created! Welcome to Puebla.');
    setTimeout(() => {
      onClose();
      if (onOpenRecord) onOpenRecord();
    }, 700);
  };

  // --- Handlers para Artesano ---
  const handleQuickDemoArtisan = () => {
    tacticalAudio.playTacticalClick();
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
      role: 'artisan',
      rememberMe: artisanRememberMe
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(session));
    if (onSessionChange) onSessionChange();
    onClose();
    navigate('/taller');
  };

  // --- Handlers para Administrador SECIHTI ---
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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey || adminKey.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Ingresa la clave institucional' : 'Enter institutional key');
      return;
    }
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano',
      rememberMe: adminRememberMe
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-slide">
      <div className="bg-[#FAF6EE] border-4 border-[#0F3078] text-[#162035] rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl space-y-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm text-[#0F3078] uppercase tracking-wide font-serif font-black">
              {language === 'es' ? 'Inicio de Sesión y Registro' : 'Login & Registration'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#0F3078]/70 hover:text-[#0F3078] font-serif p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Pestañas Principales de Rol */}
        <div className="grid grid-cols-3 gap-1.5 bg-white/90 p-1.5 rounded-2xl border border-[#0F3078]/20 shadow-xs text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setAuthRole('tourist');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              authRole === 'tourist'
                ? 'bg-[#0F3078] text-[#FAF6EE] shadow-md font-serif font-bold'
                : 'text-[#0F3078]/70 hover:text-[#0F3078] font-serif'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Explorador' : 'Explorer'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setAuthRole('artisan');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              authRole === 'artisan'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-[#0F3078]/70 hover:text-[#0F3078] font-serif'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Artesano' : 'Artisan'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setAuthRole('admin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              authRole === 'admin'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-[#0F3078]/70 hover:text-[#0F3078] font-serif'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Gobierno' : 'Admin'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="text-xs text-[var(--ok-ink)] bg-emerald-950/40 p-2.5 rounded-xl border border-[var(--line)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--ok-ink)] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROL 1: TURISTA / EXPLORADOR URBANO (LOGIN Y REGISTRO)     */}
        {/* ======================================================== */}
        {authRole === 'tourist' && (
          <div className="space-y-3.5 animate-fade-slide">
            {activeTouristUser ? (
              <div className="bg-amber-950/30 p-4 rounded-2xl border border-[var(--line)] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--brand)]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--ok-ink)]" />
                    <span>{language === 'es' ? 'Sesión de Explorador Activa' : 'Active Explorer Session'}</span>
                  </div>
                  <span className="font-mono bg-[var(--accent)] text-[var(--accent-ink)] px-2 py-0.5 rounded-full text-[10px]">
                    Nivel {activeTouristUser.level}
                  </span>
                </div>

                <div className="text-xs text-[var(--ink)]">
                  <div className="font-extrabold text-sm text-[var(--ink)]">
                    {activeTouristUser.name}
                  </div>
                  <div className="text-[var(--muted)] mt-0.5">
                    @{activeTouristUser.nickname} • {activeTouristUser.email || 'Turista Verificado'}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
                  {onOpenRecord && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRecord();
                      }}
                      className="flex-1 py-2 px-3 bg-[var(--accent)] hover:bg-[var(--accent-soft)] text-[var(--accent-ink)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Ver Mi Récord' : 'My Records'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleLogout('tourist')}
                    className="py-2 px-3 bg-[var(--well)] hover:bg-[var(--well)] text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    title={language === 'es' ? 'Cerrar sesión' : 'Log out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{language === 'es' ? 'Salir' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Sub-selector Iniciar Sesión vs Registro */}
                <div className="flex rounded-xl bg-[var(--surface-solid)] p-1 border border-[var(--line)] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTouristMode('login');
                      setErrorMsg(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      touristMode === 'login'
                        ? 'bg-slate-800 text-amber-300 shadow-sm'
                        : 'text-[#0F3078]/70 hover:text-[#0F3078] font-serif'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Iniciar Sesión' : 'Sign In'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTouristMode('register');
                      setErrorMsg(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      touristMode === 'register'
                        ? 'bg-slate-800 text-amber-300 shadow-sm'
                        : 'text-[#0F3078]/70 hover:text-[#0F3078] font-serif'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Crear Cuenta' : 'Register'}</span>
                  </button>
                </div>

                {touristMode === 'login' ? (
                  /* Formulario de Login */
                  <form onSubmit={handleTouristLogin} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Correo o Nombre de Usuario:' : 'Email or Username:'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={touristEmail}
                          onChange={(e) => setTouristEmail(e.target.value)}
                          placeholder="elena.exploradora@puebla.mx"
                          className="w-full border border-[var(--line)] rounded-xl p-2.5 pl-8 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        />
                        <Mail className="w-3.5 h-3.5 text-[var(--ink)]0 absolute left-2.5 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                        {language === 'es' ? 'PIN o Contraseña:' : 'PIN or Password:'}
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={touristPin}
                          onChange={(e) => setTouristPin(e.target.value)}
                          placeholder="••••"
                          className="w-full border border-[var(--line)] rounded-xl p-2.5 pl-8 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        />
                        <KeyRound className="w-3.5 h-3.5 text-[var(--ink)]0 absolute left-2.5 top-3" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={touristRememberMe}
                        onChange={(e) => setTouristRememberMe(e.target.checked)}
                        className="rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--line-strong)] bg-[var(--surface-solid)]"
                      />
                      <span>{language === 'es' ? 'Recordar sesión en este dispositivo' : 'Remember me on this device'}</span>
                    </label>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-soft)] text-[var(--accent-ink)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[var(--shadow)]"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Entrar como Explorador' : 'Sign In as Explorer'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickDemoTourist}
                      className="w-full py-2 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)] text-[var(--brand)] border border-[var(--line)] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                      <span>{language === 'es' ? 'Acceso Rápido Demo (1 Clic • Elena)' : 'Quick 1-Click Demo (Elena)'}</span>
                    </button>
                  </form>
                ) : (
                  /* Formulario de Registro / Record */
                  <form onSubmit={handleTouristRegister} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Nombre Completo:' : 'Full Name:'}
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Carlos Mendoza"
                        className="w-full border border-[var(--line)] rounded-xl p-2.5 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                          {language === 'es' ? 'Apodo / Alias:' : 'Explorer Nickname:'}
                        </label>
                        <input
                          type="text"
                          value={regNickname}
                          onChange={(e) => setRegNickname(e.target.value)}
                          placeholder="Caminante"
                          className="w-full border border-[var(--line)] rounded-xl p-2.5 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                          {language === 'es' ? 'PIN (4 dígitos):' : 'PIN (4 digits):'}
                        </label>
                        <input
                          type="password"
                          value={regPin}
                          onChange={(e) => setRegPin(e.target.value)}
                          placeholder="1234"
                          maxLength={8}
                          className="w-full border border-[var(--line)] rounded-xl p-2.5 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Correo Electrónico (Opcional):' : 'Email (Optional):'}
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="carlos@ejemplo.com"
                        className="w-full border border-[var(--line)] rounded-xl p-2.5 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Preferencia de Movilidad:' : 'Mobility Preference:'}
                      </label>
                      <select
                        value={regMobility}
                        onChange={(e) => setRegMobility(e.target.value as any)}
                        className="w-full border border-[var(--line)] rounded-xl p-2.5 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      >
                        <option value="sin_restriccion">
                          {language === 'es' ? 'Estándar (Sin restricción)' : 'Standard (No restriction)'}
                        </option>
                        <option value="movilidad_reducida">
                          {language === 'es' ? 'Movilidad Reducida / Carriolas' : 'Reduced Mobility / Strollers'}
                        </option>
                        <option value="silla_de_ruedas">
                          {language === 'es' ? 'Silla de Ruedas (100% Plano)' : 'Wheelchair (100% Flat)'}
                        </option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:brightness-110 text-[var(--accent-ink)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[var(--shadow)] mt-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Crear Cuenta y Guardar Récord' : 'Create Account & Save Records'}</span>
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ROL 2: MAESTRO ARTESANO                                   */}
        {/* ======================================================== */}
        {authRole === 'artisan' && (
          <div className="space-y-3.5 animate-fade-slide">
            {activeArtisanUser ? (
              <div className="bg-sky-950/40 p-4 rounded-2xl border border-[var(--line)] space-y-3">
                <div className="flex items-center gap-2 text-[var(--brand)] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-[var(--ok-ink)]" />
                  <span>{language === 'es' ? 'Sesión de Taller Activa' : 'Active Workshop Session'}</span>
                </div>
                <div className="text-xs text-[var(--ink)]">
                  <div className="font-extrabold text-sm text-[var(--ink)]">
                    {JSON.parse(activeArtisanUser).workshopName}
                  </div>
                  <div className="text-[var(--muted)] mt-0.5">
                    {JSON.parse(activeArtisanUser).artisanName} • {JSON.parse(activeArtisanUser).oficio}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/taller');
                    }}
                    className="flex-1 py-2 px-3 bg-[var(--primary)] hover:bg-sky-400 text-[var(--on-primary)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ir al Portal' : 'Open Portal'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogout('artisan')}
                    className="py-2 px-3 bg-[var(--well)] hover:bg-[var(--well)] text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    title={language === 'es' ? 'Cerrar sesión' : 'Log out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleArtisanLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Selecciona tu Taller:' : 'Select Workshop:'}
                  </label>
                  <select
                    value={selectedWorkshopId}
                    onChange={(e) => setSelectedWorkshopId(e.target.value)}
                    className="w-full border border-[var(--line)] rounded-xl p-2.5 text-xs text-[var(--ink)] bg-[var(--surface-solid)] focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {artisanPois.map((poi) => (
                      <option key={poi.id} value={poi.id}>
                        {poi.name} ({poi.zone.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    {language === 'es' ? 'PIN del Maestro Artesano:' : 'Artisan PIN:'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={artisanPin}
                      onChange={(e) => setArtisanPin(e.target.value)}
                      placeholder="1234"
                      className="w-full border border-[var(--line)] rounded-xl p-2.5 pl-8 text-xs text-[var(--ink)] bg-[var(--surface-solid)] font-mono tracking-widest placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-[var(--ink)]0 absolute left-2.5 top-3" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={artisanRememberMe}
                    onChange={(e) => setArtisanRememberMe(e.target.checked)}
                    className="rounded border-[var(--line)] text-sky-500 focus:ring-sky-400 bg-[var(--surface-solid)]"
                  />
                  <span>{language === 'es' ? 'Recordar sesión del taller' : 'Remember workshop session'}</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary)] hover:bg-sky-400 text-[var(--on-primary)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[var(--shadow)]"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Ingresar al Portal del Artesano' : 'Access Workshop Portal'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoArtisan}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)] text-[var(--brand)] border border-[var(--line)] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span>{language === 'es' ? 'Acceso Demostración Rápido (1 Clic)' : 'Quick 1-Click Demo'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ROL 3: GOBIERNO SECIHTI                                   */}
        {/* ======================================================== */}
        {authRole === 'admin' && (
          <div className="space-y-3.5 animate-fade-slide">
            {activeAdminUser ? (
              <div className="bg-emerald-950/40 p-4 rounded-2xl border border-[var(--line)] space-y-3">
                <div className="flex items-center gap-2 text-[var(--ok-ink)] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-[var(--ok-ink)]" />
                  <span>{language === 'es' ? 'Sesión de Planificador Activa' : 'Active Planner Session'}</span>
                </div>
                <div className="text-xs text-[var(--ink)]">
                  <div className="font-extrabold text-sm text-[var(--ink)]">
                    {JSON.parse(activeAdminUser).institution}
                  </div>
                  <div className="text-[var(--muted)] mt-0.5">
                    {JSON.parse(activeAdminUser).user}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/admin');
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-[var(--ink)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ir al Panel SECIHTI' : 'Open Analytics'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogout('admin')}
                    className="py-2 px-3 bg-[var(--well)] hover:bg-[var(--well)] text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                    title={language === 'es' ? 'Cerrar sesión' : 'Log out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Clave Institucional SECIHTI:' : 'Institutional Key:'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="SECIHTI-PUEBLA-2026"
                      className="w-full border border-[var(--line)] rounded-xl p-2.5 pl-8 text-xs text-[var(--ink)] bg-[var(--surface-solid)] font-mono tracking-wider placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-[var(--ink)]0 absolute left-2.5 top-3" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adminRememberMe}
                    onChange={(e) => setAdminRememberMe(e.target.checked)}
                    className="rounded border-[var(--line)] text-emerald-500 focus:ring-emerald-400 bg-[var(--surface-solid)]"
                  />
                  <span>{language === 'es' ? 'Recordar sesión de planificador' : 'Remember planner session'}</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[var(--shadow)]"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Acceder al Panel Analítico' : 'Access Analytics Portal'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoAdmin}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)] text-[var(--ok-ink)] border border-[var(--line)] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span>{language === 'es' ? 'Acceso Demostración SECIHTI (1 Clic)' : 'Quick 1-Click Demo'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default AuthModal;
