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
import { TalaveraFrieze, TalaveraCorner, TalaveraPlateMedallion } from '../../components/TalaveraOrnament';

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
    <div className="h-full min-h-screen w-full talavera-bg-pattern text-[#162035] flex flex-col justify-between font-sans selection:bg-[#0F3078] selection:text-[#FAF6EE] relative overflow-y-auto">
      {/* Cabecera de Azulejo Poblano con Cenefa Policroma */}
      <div className="w-full">
        <div className="w-full talavera-cobalt-pattern px-4 sm:px-8 py-4 text-[#FAF6EE] shadow-lg">
          <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TalaveraPlateMedallion size="md" variant="polychrome">
                <img
                  src="/popogo-logo.png"
                  alt="PopoGo Logo"
                  className="w-8 h-8 rounded-full object-contain"
                />
              </TalaveraPlateMedallion>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-wider text-[#FAF6EE] font-serif uppercase">
                    PopoGo
                  </h1>
                  <span className="text-[10px] font-sans font-extrabold px-2.5 py-0.5 rounded-full bg-[#B84A2C] text-[#FAF6EE] border border-[#F0B43A] tracking-widest uppercase shadow-sm">
                    Puebla
                  </span>
                </div>
                <p className="text-xs text-[#DCE6F9]">
                  {language === 'es'
                    ? 'Turismo Cultural Accesible • Talavera, Barrios y Patrimonio Vivo'
                    : 'Accessible Cultural Tourism & Talavera Heritage'}
                </p>
              </div>
            </div>

            {/* Indicador de Red / Persistencia Híbrida */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  dbSync.toggleSimulatedOffline();
                }}
                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm ${
                  syncStatus.isOnline
                    ? 'bg-[#FAF6EE] border-[#1D6B52] text-[#1D6B52]'
                    : 'bg-[#FAF6EE] border-[#D48914] text-[#9A6208]'
                }`}
                title={
                  language === 'es'
                    ? 'Haz clic para alternar demostración Fuera de Línea / En Línea'
                    : 'Click to toggle simulated offline/online'
                }
              >
                {syncStatus.isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-[#1D6B52]" />
                    <span>{language === 'es' ? 'En Línea (Cloud)' : 'Online (Cloud)'}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-[#D48914]" />
                    <span>{language === 'es' ? 'Modo Offline (Local)' : 'Offline Mode (Local)'}</span>
                  </>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#0F3078]/10 text-[#0F3078] font-mono">
                  {syncStatus.isSimulatedOffline ? 'Simulado' : 'Auto'}
                </span>
              </button>
            </div>
          </div>
        </div>
        <TalaveraFrieze />
      </div>

      {/* Placa Cerámica Principal de Autenticación (Esmalte Blanco Majólica con Doble Filete Cobalto) */}
      <div className="w-full max-w-md mx-auto my-6 px-4">
        <div className="relative talavera-plate-card rounded-[32px] p-6 sm:p-8 space-y-5 animate-fade-slide overflow-hidden">
          <TalaveraCorner position="tl" />
          <TalaveraCorner position="tr" />
          <TalaveraCorner position="bl" />
          <TalaveraCorner position="br" />

          {/* Medallón superior estilo Plato de Talavera */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="flex justify-center mb-1">
              <TalaveraPlateMedallion
                size="md"
                variant={
                  activeTab === 'artisan'
                    ? 'terracotta'
                    : activeTab === 'government'
                    ? 'polychrome'
                    : 'cobalt'
                }
              >
                {activeTab === 'tourist' && <Compass className="w-6 h-6 text-[#0F3078]" />}
                {activeTab === 'artisan' && <Store className="w-6 h-6 text-[#B84A2C]" />}
                {activeTab === 'government' && <BarChart3 className="w-6 h-6 text-[#1D6B52]" />}
              </TalaveraPlateMedallion>
            </div>
            <h2 className="text-xl font-black text-[#0F3078] tracking-tight font-serif">
              {language === 'es' ? 'Bienvenido a PopoGo Puebla' : 'Welcome to PopoGo Puebla'}
            </h2>
            <p className="text-xs text-[#162035]/75 font-medium">
              {language === 'es'
                ? 'Elige tu perfil para explorar rutas, gestionar tu taller o auditar barrios'
                : 'Choose your profile to explore routes, manage workshops, or audit wards'}
            </p>
          </div>

          {/* Selector de Rol con los 3 Pigmentos de Puebla: Cobalto, Terracota y Verde Cobre */}
          <div className="grid grid-cols-3 gap-1.5 bg-[#F2EBDC] p-1.5 rounded-2xl border-2 border-[#0F3078]/25 text-xs">
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('tourist');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-xl font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === 'tourist'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-md scale-[1.02] border border-[#F0B43A]'
                  : 'text-[#0F3078] hover:bg-[#DCE6F9]/60'
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
              className={`py-2 rounded-xl font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === 'artisan'
                  ? 'bg-[#B84A2C] text-[#FAF6EE] shadow-md scale-[1.02] border border-[#F0B43A]'
                  : 'text-[#B84A2C] hover:bg-[#B84A2C]/10'
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
              className={`py-2 rounded-xl font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === 'government'
                  ? 'bg-[#1D6B52] text-[#FAF6EE] shadow-md scale-[1.02] border border-[#F0B43A]'
                  : 'text-[#1D6B52] hover:bg-[#1D6B52]/10'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{language === 'es' ? 'Gobierno' : 'Admin'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#B84A2C]/15 border-2 border-[#B84A2C] text-[#8E2F15] font-bold text-xs">
              {errorMsg}
            </div>
          )}

          {/* 1. VISTA DE TURISTA / EXPLORADOR (Cobalto & Ocre) */}
          {activeTab === 'tourist' && (
            <div className="space-y-4">
              <div className="flex border-b-2 border-[#0F3078]/15 text-xs">
                <button
                  type="button"
                  onClick={() => setTouristMode('login')}
                  className={`flex-1 pb-2 font-extrabold transition text-center cursor-pointer ${
                    touristMode === 'login'
                      ? 'text-[#0F3078] border-b-2 border-[#0F3078]'
                      : 'text-[#162035]/60 hover:text-[#0F3078]'
                  }`}
                >
                  {language === 'es' ? 'Iniciar Sesión' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setTouristMode('register')}
                  className={`flex-1 pb-2 font-extrabold transition text-center cursor-pointer ${
                    touristMode === 'register'
                      ? 'text-[#B84A2C] border-b-2 border-[#B84A2C]'
                      : 'text-[#162035]/60 hover:text-[#B84A2C]'
                  }`}
                >
                  {language === 'es' ? 'Crear Cuenta' : 'Register'}
                </button>
              </div>

              {touristMode === 'login' ? (
                <form onSubmit={handleTouristSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Correo o Usuario:' : 'Email or User:'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#0F3078] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={touristEmail}
                        onChange={(e) => setTouristEmail(e.target.value)}
                        placeholder="elena.exploradora@puebla.mx"
                        className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl pl-9 pr-3 py-2 text-[#162035] font-medium placeholder:text-[#162035]/40 focus:outline-none focus:border-[#0F3078]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase tracking-wider mb-1">
                      {language === 'es' ? 'PIN / Contraseña:' : 'PIN / Password:'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#0F3078] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="password"
                        value={touristPin}
                        onChange={(e) => setTouristPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl pl-9 pr-3 py-2 text-[#162035] focus:outline-none focus:border-[#0F3078] font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#162035]/80 font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={touristRemember}
                        onChange={(e) => setTouristRemember(e.target.checked)}
                        className="rounded border-[#0F3078] text-[#0F3078] focus:ring-0"
                      />
                      <span>{language === 'es' ? 'Recordar sesión' : 'Remember me'}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-black flex items-center justify-center gap-2 shadow-lg border border-[#F0B43A] transition cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ingresar como Explorador' : 'Sign In as Explorer'}</span>
                    <ArrowRight className="w-4 h-4 text-[#F0B43A]" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTouristSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase mb-1">
                      {language === 'es' ? 'Nombre Completo:' : 'Full Name:'}
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Elena García Méndez"
                      className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl px-3 py-2 text-[#162035] font-medium focus:outline-none focus:border-[#0F3078]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase mb-1">
                      {language === 'es' ? 'Apodo / Nickname:' : 'Explorer Nickname:'}
                    </label>
                    <input
                      type="text"
                      value={regNickname}
                      onChange={(e) => setRegNickname(e.target.value)}
                      placeholder="Caminante de Analco"
                      className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl px-3 py-2 text-[#162035] font-medium focus:outline-none focus:border-[#0F3078]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase mb-1">
                      {language === 'es' ? 'Perfil de Movilidad Peatonal:' : 'Mobility Profile:'}
                    </label>
                    <select
                      value={regMobility}
                      onChange={(e: any) => setRegMobility(e.target.value)}
                      className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl px-3 py-2 text-[#162035] font-semibold focus:outline-none focus:border-[#0F3078]"
                    >
                      <option value="sin_restriccion">{language === 'es' ? 'Caminante (Sin restricción)' : 'Walking (Standard)'}</option>
                      <option value="movilidad_reducida">{language === 'es' ? 'Adulto mayor / Paso moderado' : 'Senior / Moderate pace'}</option>
                      <option value="silla_de_ruedas">{language === 'es' ? 'Silla de Ruedas / Rampa y guía' : 'Wheelchair / Step-free'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase mb-1">
                      {language === 'es' ? 'Correo Electrónico (Opcional):' : 'Email (Optional):'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#0F3078] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="elena@ejemplo.com"
                        className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl pl-9 pr-3 py-2 text-[#162035] focus:outline-none focus:border-[#0F3078]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0F3078] uppercase mb-1">
                      {language === 'es' ? 'PIN de 4 dígitos:' : '4-digit PIN:'}
                    </label>
                    <input
                      type="password"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-[#FFFDF9] border-2 border-[#0F3078]/35 rounded-xl px-3 py-2 text-[#162035] focus:outline-none focus:border-[#0F3078] font-mono tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#F0B43A]" />
                    <span>{language === 'es' ? 'Crear Cuenta y Empezar' : 'Create Account & Begin'}</span>
                  </button>
                </form>
              )}

              {/* Botón de Acceso Rápido 1-Clic con Acento Ocre Solar */}
              <div className="pt-2 border-t border-[#0F3078]/15">
                <button
                  type="button"
                  onClick={handleQuickDemoTourist}
                  className="w-full py-2.5 rounded-xl bg-[#F0B43A]/25 hover:bg-[#F0B43A]/40 border-2 border-[#D48914] text-[#162035] text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group"
                >
                  <Sparkles className="w-4 h-4 text-[#B84A2C] group-hover:scale-110 transition-transform" />
                  <span>{language === 'es' ? 'Acceso Rápido Demo: Elena García (Caminante)' : 'Quick Demo: Elena (Tourist)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. VISTA DE MAESTRO ARTESANO (Terracota Ladrillo de Analco & La Luz) */}
          {activeTab === 'artisan' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#B84A2C]/10 border-2 border-[#B84A2C]/40 text-xs text-[#7C2D12] font-medium">
                {language === 'es'
                  ? 'Portal para maestros alfareros, ceramistas de talavera y talleres tradicionales de Analco, La Luz y El Parián.'
                  : 'Portal for master potters, Talavera ceramists, and craft workshops in Puebla.'}
              </div>

              <form onSubmit={handleArtisanSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#B84A2C] uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Selecciona tu Taller:' : 'Select Workshop:'}
                  </label>
                  <select
                    value={selectedWorkshopId}
                    onChange={(e) => setSelectedWorkshopId(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-[#B84A2C]/45 rounded-xl p-2.5 text-[#162035] font-semibold focus:outline-none focus:border-[#B84A2C]"
                  >
                    {artisanPois.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.zone.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#B84A2C] uppercase tracking-wider mb-1">
                    {language === 'es' ? 'PIN de Acceso de Taller:' : 'Workshop PIN:'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#B84A2C] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      value={artisanPin}
                      onChange={(e) => setArtisanPin(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-[#FFFDF9] border-2 border-[#B84A2C]/45 rounded-xl pl-9 pr-3 py-2 text-[#162035] focus:outline-none focus:border-[#B84A2C] font-mono tracking-widest"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#B84A2C] hover:bg-[#9E3B20] text-[#FAF6EE] font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <span>{language === 'es' ? 'Ingresar al Portal del Taller' : 'Enter Workshop Portal'}</span>
                  <ArrowRight className="w-4 h-4 text-[#F0B43A]" />
                </button>
              </form>

              <div className="pt-2 border-t border-[#B84A2C]/20">
                <button
                  type="button"
                  onClick={handleQuickDemoArtisan}
                  className="w-full py-2.5 rounded-xl bg-[#B84A2C]/15 hover:bg-[#B84A2C]/25 border-2 border-[#B84A2C] text-[#7C2D12] text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 text-[#B84A2C] group-hover:scale-110 transition-transform" />
                  <span>{language === 'es' ? 'Acceso Rápido Demo: Taller Talavera de la Luz' : 'Quick Demo: Talavera Workshop'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. VISTA DE GOBIERNO / SECIHTI (Verde Cobre Mineral) */}
          {activeTab === 'government' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#1D6B52]/10 border-2 border-[#1D6B52]/40 text-xs text-[#134E3A] font-medium">
                {language === 'es'
                  ? 'Acceso institucional para auditores urbanos y planificadores territoriales de SECIHTI y Ayuntamiento de Puebla.'
                  : 'Institutional access for SECIHTI municipal urban planners.'}
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#1D6B52] uppercase tracking-wider mb-1">
                    {language === 'es' ? 'Clave de Acceso Institucional:' : 'Institutional Key:'}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-[#1D6B52] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="puebla-secihti-2026"
                      className="w-full bg-[#FFFDF9] border-2 border-[#1D6B52]/45 rounded-xl pl-9 pr-3 py-2 text-[#162035] focus:outline-none focus:border-[#1D6B52] font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#1D6B52] hover:bg-[#15533F] text-[#FAF6EE] font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <span>{language === 'es' ? 'Ingresar a Panel SECIHTI' : 'Access SECIHTI Dashboard'}</span>
                  <ArrowRight className="w-4 h-4 text-[#F0B43A]" />
                </button>
              </form>

              <div className="pt-2 border-t border-[#1D6B52]/20">
                <button
                  type="button"
                  onClick={handleQuickDemoAdmin}
                  className="w-full py-2.5 rounded-xl bg-[#1D6B52]/15 hover:bg-[#1D6B52]/25 border-2 border-[#1D6B52] text-[#134E3A] text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 text-[#1D6B52] group-hover:scale-110 transition-transform" />
                  <span>{language === 'es' ? 'Acceso Rápido Demo: Planificador SECIHTI' : 'Quick Demo: SECIHTI Planner'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pie de Página PopoGo con Cenefa de Talavera */}
      <div className="w-full bg-[#FAF6EE] border-t-2 border-[#0F3078] py-3 px-4 text-center text-xs text-[#162035]">
        <p className="font-extrabold text-[#0F3078] font-serif">
          PopoGo Puebla • Cerámica de Talavera, Barrios Históricos y Rutas Accesibles
        </p>
        <p className="text-[11px] text-[#B84A2C] font-semibold mt-0.5">
          Zócalo • Barrio de Analco • La Luz • El Parián • El Alto • Xanenetla
        </p>
      </div>
    </div>
  );
};

