import { useState, useEffect, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import {
  Compass,
  Store,
  BarChart3,
  KeyRound,
  Sparkles,
  ShieldCheck,
  User,
  UserPlus,
  Mail,
  Wifi,
  WifiOff,
  ArrowRight
} from 'lucide-react';
import { tacticalAudio } from '../../utils/tacticalAudio';
import { UserProfile } from '../../types/userRecord';
import { dbSync, SyncStatus } from '../../services/dbSync';

interface LoginGateViewProps {
  pois: POI[];
  language: Language;
  onAuthenticated: (role: 'tourist' | 'artisan' | 'government', sessionData: any) => void;
}

export const LoginGateView: FC<LoginGateViewProps> = ({
  pois,
  language,
  onAuthenticated
}) => {
  const [activeTab, setActiveTab] = useState<'tourist' | 'artisan' | 'government'>('tourist');
  const [touristMode, setTouristMode] = useState<'login' | 'register'>('login');

  // Formulario Turista
  const [touristEmail, setTouristEmail] = useState('');
  const [touristPin, setTouristPin] = useState('');
  const [touristRemember, setTouristRemember] = useState(true);

  // Formulario Registro Turista
  const [regName, setRegName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regMobility, setRegMobility] = useState<'sin_restriccion' | 'movilidad_reducida' | 'silla_de_ruedas'>('sin_restriccion');

  // Formulario Artesano
  const artisanPois = pois.filter((p) => p.is_local_business && p.artisan_profile);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(artisanPois[0]?.id || '');
  const [artisanPin, setArtisanPin] = useState('');

  // Formulario Admin
  const [adminKey, setAdminKey] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(dbSync.getStatus());

  useEffect(() => {
    return dbSync.subscribe((st) => setSyncStatus(st));
  }, []);

  // --- Handlers de Autenticación de Turista ---
  const handleTouristSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    tacticalAudio.playTacticalClick();

    if (touristMode === 'login') {
      if (!touristEmail.trim()) {
        setErrorMsg(language === 'es' ? 'Ingresa tu usuario o correo' : 'Enter user or email');
        return;
      }
      if (!touristPin || touristPin.trim().length < 4) {
        setErrorMsg(language === 'es' ? 'Ingresa tu PIN de 4 dígitos' : 'Enter 4-digit PIN');
        return;
      }

      const user: UserProfile = {
        id: `tourist_${Date.now()}`,
        name: touristEmail.includes('@') ? touristEmail.split('@')[0] : touristEmail,
        nickname: touristEmail.includes('@') ? touristEmail.split('@')[0] : touristEmail,
        email: touristEmail.includes('@') ? touristEmail : undefined,
        role: 'tourist',
        mobilityProfile: 'sin_restriccion',
        level: 1,
        xp: 150,
        createdAt: new Date().toISOString().slice(0, 10),
        rememberMe: touristRemember
      };

      await dbSync.saveUserProfile(user);
      onAuthenticated('tourist', user);
    } else {
      if (!regName.trim() || regName.trim().length < 3) {
        setErrorMsg(language === 'es' ? 'Ingresa tu nombre completo' : 'Enter full name');
        return;
      }
      if (!regPin || regPin.trim().length < 4) {
        setErrorMsg(language === 'es' ? 'Elige un PIN de al menos 4 dígitos' : 'Choose 4-digit PIN');
        return;
      }

      const user: UserProfile = {
        id: `tourist_${Date.now()}`,
        name: regName.trim(),
        nickname: regNickname.trim() || regName.trim().split(' ')[0],
        email: regEmail.trim() || undefined,
        role: 'tourist',
        mobilityProfile: regMobility,
        level: 1,
        xp: 200,
        createdAt: new Date().toISOString().slice(0, 10),
        rememberMe: touristRemember
      };

      await dbSync.saveUserProfile(user);
      onAuthenticated('tourist', user);
    }
  };

  const handleQuickDemoTourist = async () => {
    tacticalAudio.playStampSuccess();
    const demoUser: UserProfile = {
      id: 'tourist_demo_01',
      name: 'Elena García Méndez',
      nickname: 'Caminante de Analco',
      email: 'elena.exploradora@puebla.mx',
      role: 'tourist',
      mobilityProfile: 'sin_restriccion',
      level: 3,
      xp: 750,
      createdAt: '2026-10-15',
      rememberMe: true
    };
    await dbSync.saveUserProfile(demoUser);
    onAuthenticated('tourist', demoUser);
  };

  // --- Handlers de Artesano ---
  const handleArtisanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    tacticalAudio.playTacticalClick();
    if (!artisanPin || artisanPin.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Ingresa el PIN de taller (ej. 1234)' : 'Enter PIN (e.g. 1234)');
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
    onAuthenticated('artisan', session);
  };

  const handleQuickDemoArtisan = () => {
    tacticalAudio.playStampSuccess();
    const workshop = artisanPois[0] || {
      id: 'poi_horno_la_luz',
      name: 'Taller de Talavera de la Luz',
      artisan_profile: { maestro_artesano: 'Mtro. José Luis Morales', oficio: 'Talavera Tradicional' }
    };
    const session = {
      poiId: workshop.id,
      workshopName: workshop.name,
      artisanName: workshop.artisan_profile?.maestro_artesano || 'Mtro. José Luis Morales',
      oficio: workshop.artisan_profile?.oficio || 'Talavera Tradicional',
      role: 'artisan',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_artisan_user', JSON.stringify(session));
    onAuthenticated('artisan', session);
  };

  // --- Handlers de Administrador SECIHTI ---
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    tacticalAudio.playTacticalClick();
    if (!adminKey || adminKey.trim().length < 4) {
      setErrorMsg(language === 'es' ? 'Ingresa la clave institucional' : 'Enter institutional key');
      return;
    }
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano y Territorial',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(session));
    onAuthenticated('government', session);
  };

  const handleQuickDemoAdmin = () => {
    tacticalAudio.playStampSuccess();
    const session = {
      role: 'admin',
      institution: 'SECIHTI • Gobierno de Puebla',
      user: 'Planificador Urbano y Territorial',
      rememberMe: true
    };
    localStorage.setItem('ruta_abierta_admin_user', JSON.stringify(session));
    onAuthenticated('government', session);
  };

  return (
    <div className="min-h-screen w-full bg-[#07154E] text-[#EFF1F8] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#EDE28E] selection:text-[#0E2C9C] relative overflow-y-auto">
      {/* Fondo ambiental sutil con azul cobalto y talavera */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0E2C9C]/40 via-[#07154E] to-[#030A26] pointer-events-none -z-10" />
      <div
        className="absolute inset-0 pointer-events-none opacity-5 -z-10"
        style={{
          backgroundImage: `radial-gradient(#EDE28E 1.5px, transparent 1.5px), radial-gradient(#9597C1 1.5px, transparent 1.5px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px'
        }}
      />

      {/* Barra superior con Identidad PopoGo y Estado de Conexión en Vivo */}
      <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/popogo-logo.png"
            alt="PopoGo Logo"
            className="w-12 h-12 rounded-full border-2 border-[#EDE28E] shadow-[0_0_20px_rgba(237,226,142,0.4)] object-cover bg-white"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-wider text-white font-serif uppercase">
                PopoGo
              </h1>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#EDE28E] text-[#0E2C9C] tracking-widest uppercase">
                Puebla
              </span>
            </div>
            <p className="text-xs text-[#9597C1]">
              {language === 'es'
                ? 'Turismo Cultural Accesible • Centro Histórico y Barrios Tradicionales'
                : 'Accessible Cultural Tourism & Historic Neighborhoods'}
            </p>
          </div>
        </div>

        {/* Indicador de Red / Persistencia Híbrida (Conexión / Sin Conexión) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              dbSync.toggleSimulatedOffline();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              syncStatus.isOnline
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
            title={
              language === 'es'
                ? 'Haz clic para alternar demostración Fuera de Línea / En Línea'
                : 'Click to toggle simulated offline/online'
            }
          >
            {syncStatus.isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'es' ? 'En Línea (Cloud)' : 'Online (Cloud)'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'es' ? 'Modo Offline (Local)' : 'Offline Mode (Local)'}</span>
              </>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 font-mono">
              {syncStatus.isSimulatedOffline ? 'Simulado' : 'Auto'}
            </span>
          </button>
        </div>
      </div>

      {/* Contenedor Principal de Autenticación */}
      <div className="w-full max-w-md mx-auto my-8 bg-[#0B228A]/90 backdrop-blur-2xl border border-[#9597C1]/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(3,10,38,0.9)] space-y-6 animate-fade-slide">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-black text-white tracking-tight font-serif">
            {language === 'es' ? 'Iniciar Sesión en PopoGo' : 'Sign In to PopoGo'}
          </h2>
          <p className="text-xs text-[#EFF1F8]/80">
            {language === 'es'
              ? 'Selecciona tu tipo de perfil para acceder a tus herramientas correspondientes'
              : 'Choose your profile to access your dedicated workspace'}
          </p>
        </div>

        {/* Selector de Rol con 3 Pestañas Claras en Paleta PopoGo */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#07154E] p-1.5 rounded-2xl border border-[#9597C1]/20 text-xs">
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('tourist');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
              activeTab === 'tourist'
                ? 'bg-[#EDE28E] text-[#0E2C9C] shadow-md scale-[1.02]'
                : 'text-[#9597C1] hover:text-[#EFF1F8]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{language === 'es' ? 'Turista' : 'Tourist'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('artisan');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
              activeTab === 'artisan'
                ? 'bg-[#9597C1] text-[#07154E] shadow-md scale-[1.02]'
                : 'text-[#9597C1] hover:text-[#EFF1F8]'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>{language === 'es' ? 'Taller' : 'Artisan'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('government');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
              activeTab === 'government'
                ? 'bg-[#7B5E86] text-white shadow-md scale-[1.02]'
                : 'text-[#9597C1] hover:text-[#EFF1F8]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{language === 'es' ? 'Gobierno' : 'Admin'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs animate-shake">
            {errorMsg}
          </div>
        )}

        {/* 1. VISTA DE TURISTA / EXPLORADOR */}
        {activeTab === 'tourist' && (
          <div className="space-y-4">
            {/* Alternador Login / Registro */}
            <div className="flex border-b border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setTouristMode('login')}
                className={`flex-1 pb-2 font-bold transition text-center cursor-pointer ${
                  touristMode === 'login'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'es' ? 'Iniciar Sesión' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setTouristMode('register')}
                className={`flex-1 pb-2 font-bold transition text-center cursor-pointer ${
                  touristMode === 'register'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'es' ? 'Crear Cuenta' : 'Register'}
              </button>
            </div>

            {touristMode === 'login' ? (
              <form onSubmit={handleTouristSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Correo o Usuario:' : 'Email or User:'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={touristEmail}
                      onChange={(e) => setTouristEmail(e.target.value)}
                      placeholder="elena.exploradora@puebla.mx"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'es' ? 'PIN / Contraseña:' : 'PIN / Password:'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      value={touristPin}
                      onChange={(e) => setTouristPin(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={touristRemember}
                      onChange={(e) => setTouristRemember(e.target.checked)}
                      className="rounded bg-slate-950 border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span>{language === 'es' ? 'Recordar sesión' : 'Remember me'}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <span>{language === 'es' ? 'Ingresar como Explorador' : 'Sign In as Explorer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleTouristSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    {language === 'es' ? 'Nombre Completo:' : 'Full Name:'}
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Elena García Méndez"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    {language === 'es' ? 'Apodo / Nickname:' : 'Explorer Nickname:'}
                  </label>
                  <input
                    type="text"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="Caminante de Analco"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    {language === 'es' ? 'Perfil de Movilidad Peatonal:' : 'Mobility Profile:'}
                  </label>
                  <select
                    value={regMobility}
                    onChange={(e: any) => setRegMobility(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="sin_restriccion">{language === 'es' ? 'Caminante (Sin restricción)' : 'Walking (Standard)'}</option>
                    <option value="movilidad_reducida">{language === 'es' ? 'Adulto mayor / Paso moderado' : 'Senior / Moderate pace'}</option>
                    <option value="silla_de_ruedas">{language === 'es' ? 'Silla de Ruedas / Rampa y guía' : 'Wheelchair / Step-free'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    {language === 'es' ? 'Correo Electrónico (Opcional):' : 'Email (Optional):'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="elena@ejemplo.com"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    {language === 'es' ? 'PIN de 4 dígitos:' : '4-digit PIN:'}
                  </label>
                  <input
                    type="password"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'es' ? 'Crear Cuenta y Empezar' : 'Create Account & Begin'}</span>
                </button>
              </form>
            )}

            {/* Botón de Acceso Rápido 1-Clic Sin Fricciones */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleQuickDemoTourist}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group"
              >
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>{language === 'es' ? 'Acceso Rápido Demo: Elena García (Caminante)' : 'Quick Demo: Elena (Tourist)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. VISTA DE MAESTRO ARTESANO */}
        {activeTab === 'artisan' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200">
              {language === 'es'
                ? 'Portal exclusivo para maestros alfareros, ceramistas de talavera y comerciantes de Analco, La Luz y El Parián.'
                : 'Exclusive portal for artisans and craft workshops in Puebla.'}
            </div>

            <form onSubmit={handleArtisanSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Selecciona tu Taller:' : 'Select Workshop:'}
                </label>
                <select
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  {language === 'es' ? 'PIN de Acceso de Taller:' : 'Workshop PIN:'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    value={artisanPin}
                    onChange={(e) => setArtisanPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <span>{language === 'es' ? 'Ingresar al Portal del Taller' : 'Enter Workshop Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Acceso Rápido 1-Clic Taller */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleQuickDemoArtisan}
                className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>{language === 'es' ? 'Acceso Rápido Demo: Taller Talavera de la Luz' : 'Quick Demo: Talavera Workshop'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. VISTA DE GOBIERNO / SECIHTI */}
        {activeTab === 'government' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
              {language === 'es'
                ? 'Acceso restringido para auditores urbanos y planificadores territoriales de SECIHTI y Ayuntamiento de Puebla.'
                : 'Restricted access for SECIHTI municipal urban planners.'}
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Clave de Acceso Institucional:' : 'Institutional Key:'}
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="puebla-secihti-2026"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <span>{language === 'es' ? 'Ingresar a Panel SECIHTI' : 'Access SECIHTI Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Acceso Rápido 1-Clic Admin */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleQuickDemoAdmin}
                className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>{language === 'es' ? 'Acceso Rápido Demo: Planificador SECIHTI' : 'Quick Demo: SECIHTI Planner'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pie de Página PopoGo */}
      <div className="text-center text-xs text-[#9597C1] space-y-1">
        <p className="font-semibold text-[#EFF1F8]/90">PopoGo Puebla • Identidad Talavera, Rutas Accesibles y Patrimonio Vivo</p>
        <p className="text-[11px] text-[#9597C1]/80">
          Zócalo • Barrio de Analco • La Luz • El Parián • El Alto • Xanenetla
        </p>
      </div>
    </div>
  );
};
