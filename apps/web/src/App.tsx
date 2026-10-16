import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  POI,
  SidewalkGraph,
  TimeMatrices,
  PassportState
} from '@ruta-abierta/shared-types';
import { DataInfoModal } from './components/DataInfoModal';
import { CelebrationModal } from './components/CelebrationModal';
import { AuthModal } from './components/AuthModal';
import { UserRecordModal } from './components/UserRecordModal';
import { UserProfile } from './types/userRecord';
import { USER_ROLES, UserRole } from './types/roles';
import { LoginGateView } from './views/auth/LoginGateView';
import { dbSync } from './services/dbSync';
import {
  Languages,
  Compass,
  Store,
  BarChart3,
  UserCheck,
  Check,
  X,
  Radio,
  Trophy,
  LogOut,
  PlayCircle
} from 'lucide-react';
import { tacticalAudio } from './utils/tacticalAudio';
import { RouterProvider, useRouter } from './router/Router';
import { verifyOfflineStampPayload, recordStampInLedger } from './utils/offlineStamp';
import { SplashScreen } from './components/SplashScreen';

// Carga diferida (code-splitting) de las 3 vistas por rol
const VisitorView = React.lazy(() => import('./views/visitor/VisitorView'));
const ArtisanView = React.lazy(() => import('./views/artisan/ArtisanView'));
const AdminView = React.lazy(() => import('./views/admin/AdminView'));

function MainApp() {
  const { activeRoute, navigate } = useRouter();

  // Mapeo automático de ruta a rol de usuario
  const currentRole: UserRole = useMemo(() => {
    if (activeRoute === '/taller') return 'artisan';
    if (activeRoute === '/admin') return 'government';
    return 'tourist';
  }, [activeRoute]);

  // Modo de visualización: Marco Móvil 390x844 o Pantalla Completa
  const [viewportMode, setViewportMode] = useState<'mobile' | 'full'>('full');

  // Modales
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sesión del usuario explorador activo
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_tourist_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sesión del artesano activo
  const [artisanUser, setArtisanUser] = useState<{
    poiId: string;
    workshopName: string;
    artisanName: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_artisan_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sesión del administrador gubernamental activo
  const [adminUser, setAdminUser] = useState<{
    role: string;
    institution: string;
    user: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const syncCurrentUser = () => {
    try {
      const savedTourist = localStorage.getItem('ruta_abierta_tourist_user');
      setCurrentUser(savedTourist ? JSON.parse(savedTourist) : null);
      const savedArtisan = localStorage.getItem('ruta_abierta_artisan_user');
      setArtisanUser(savedArtisan ? JSON.parse(savedArtisan) : null);
      const savedAdmin = localStorage.getItem('ruta_abierta_admin_user');
      setAdminUser(savedAdmin ? JSON.parse(savedAdmin) : null);
    } catch {
      setCurrentUser(null);
    }
  };

  const [celebrationData, setCelebrationData] = useState<{
    badgeName: string;
    title: string;
    description: string;
    zone: string;
  } | null>(null);

  // Ubicación del usuario en el mapa (por defecto: Zócalo de Puebla)
  const [userLocation, setUserLocation] = useState<[number, number]>([-98.198, 19.0431]);

  // Datos
  const [pois, setPois] = useState<POI[]>([]);
  const [graph, setGraph] = useState<SidewalkGraph | null>(null);
  const [matrices, setMatrices] = useState<TimeMatrices | null>(null);
  const [weights, setWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Pasaporte de Exploración dinámico
  const [passportState, setPassportState] = useState<PassportState>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_passport');
      return saved
        ? JSON.parse(saved)
        : { unlocked_secrets: [], visited_poi_ids: [], collected_badges: [] };
    } catch {
      return { unlocked_secrets: [], visited_poi_ids: [], collected_badges: [] };
    }
  });

  const handleUnlockSecret = (poiId: string, badgeName: string) => {
    setPassportState((prev) => {
      const newSecrets = prev.unlocked_secrets.includes(poiId)
        ? prev.unlocked_secrets
        : [...prev.unlocked_secrets, poiId];
      const newBadges = prev.collected_badges.includes(badgeName)
        ? prev.collected_badges
        : [...prev.collected_badges, badgeName];
      const next = { ...prev, unlocked_secrets: newSecrets, collected_badges: newBadges };
      try {
        localStorage.setItem('ruta_abierta_passport', JSON.stringify(next));
      } catch {}
      dbSync.savePassportState(next, currentUser?.id);
      return next;
    });

    const targetPoi = pois.find((p) => p.id === poiId);
    if (targetPoi && targetPoi.secret_to_unlock) {
      setCelebrationData({
        badgeName,
        title: targetPoi.secret_to_unlock.titulo,
        description: targetPoi.secret_to_unlock.descripcion,
        zone: targetPoi.zone
      });
    }
  };

  // Carga inicial con cache-busting para Brave y Cloudflare
  useEffect(() => {
    async function loadStaticData() {
      try {
        const fetchOpts: RequestInit = { cache: 'no-store' };
        const [poisRes, graphRes, matricesRes, weightsRes] = await Promise.all([
          fetch('/data/pois.json?v=3', fetchOpts).then((r) => r.json()),
          fetch('/data/sidewalk_graph.json?v=3', fetchOpts).then((r) => r.json()),
          fetch('/data/time_matrices.json?v=3', fetchOpts).then((r) => r.json()),
          fetch('/data/choice_model_weights.json?v=3', fetchOpts).then((r) => r.json())
        ]);

        setPois(poisRes);
        setGraph(graphRes);
        setMatrices(matricesRes);
        setWeights(weightsRes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setIsLoading(false);
      }
    }

    loadStaticData();
  }, []);

  // Intercepción de Deep-Link de Etiqueta NFC Física (NDEF URI para iPhone/iOS y Android)
  useEffect(() => {
    if (pois.length === 0 || typeof window === 'undefined') return;
    const search = window.location.search;
    if (!search || (!search.includes('nfc_stamp=') && !search.includes('code='))) return;

    const verified = verifyOfflineStampPayload(
      window.location.href,
      undefined,
      pois.map((p) => p.id)
    );

    if (verified.valid && verified.poiId) {
      const targetPoi = pois.find((p) => p.id === verified.poiId);
      if (targetPoi) {
        // Si el visitante abrió el enlace con su teléfono sin sesión previa, iniciar sesión rápida de caminante
        if (!currentUser) {
          const autoTourist: UserProfile = {
            id: `tourist_nfc_${Date.now()}`,
            name: 'Explorador NFC',
            nickname: 'Caminante NFC',
            role: 'tourist',
            mobilityProfile: 'sin_restriccion',
            level: 1,
            xp: 200,
            createdAt: new Date().toISOString().slice(0, 10),
            rememberMe: true
          };
          setCurrentUser(autoTourist);
          dbSync.saveUserProfile(autoTourist);
        }

        const badge =
          targetPoi.secret_to_unlock?.insignia_nombre ||
          targetPoi.artisan_profile?.sello_artesanal ||
          `Medallón ${targetPoi.name}`;

        recordStampInLedger({
          poiId: targetPoi.id,
          poiName: targetPoi.name,
          code: verified.code || '',
          method: 'deep-link'
        });

        tacticalAudio.playStampSuccess();
        handleUnlockSecret(targetPoi.id, badge);
      }
      // Limpiar parámetros de la URL tras procesar la etiqueta NFC
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [pois]);


  const handleAuthenticated = (
    role: 'tourist' | 'artisan' | 'government',
    sessionData: any
  ) => {
    tacticalAudio.playStampSuccess();
    if (role === 'tourist') {
      setCurrentUser(sessionData);
      navigate('/');
    } else if (role === 'artisan') {
      setArtisanUser(sessionData);
      navigate('/taller');
    } else if (role === 'government') {
      setAdminUser(sessionData);
      navigate('/admin');
    }
  };

  const handleLogout = () => {
    tacticalAudio.playTacticalClick();
    if (activeRoute === '/') {
      localStorage.removeItem('ruta_abierta_tourist_user');
      setCurrentUser(null);
    } else if (activeRoute === '/taller') {
      localStorage.removeItem('ruta_abierta_artisan_user');
      setArtisanUser(null);
    } else if (activeRoute === '/admin') {
      localStorage.removeItem('ruta_abierta_admin_user');
      setAdminUser(null);
    }
  };

  // Verificación estricta de sesión requerida antes de abrir la aplicación
  const isCurrentRouteAuthenticated = useMemo(() => {
    if (activeRoute === '/taller') return !!artisanUser;
    if (activeRoute === '/admin') return !!adminUser;
    return !!currentUser;
  }, [activeRoute, currentUser, artisanUser, adminUser]);

  const handleSelectRole = (newRole: UserRole) => {
    tacticalAudio.playTacticalClick();
    if (newRole === 'tourist') {
      navigate('/');
      setIsRoleModalOpen(false);
    } else {
      setIsRoleModalOpen(false);
      setIsAuthModalOpen(true);
    }
  };

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        isLoadingData={isLoading}
        language={language}
      />
    );
  }

  if (isLoading) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        isLoadingData={true}
        language={language}
      />
    );
  }

  // Pantalla de login obligatoria antes de siquiera abrir la aplicación
  if (!isCurrentRouteAuthenticated) {
    return (
      <LoginGateView
        pois={pois}
        language={language}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07154E] text-[#EFF1F8] flex flex-col font-sans antialiased selection:bg-[#EDE28E] selection:text-[#0E2C9C]">
      {/* Cabecera Principal PopoGo */}
      <header className="bg-[#0B228A]/95 backdrop-blur-xl border-b border-[#9597C1]/25 text-[#EFF1F8] z-40 flex-shrink-0">
        <div className="w-full px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo y Nombre PopoGo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group min-w-0"
          >
            <img
              src="/popogo-logo.png"
              alt="PopoGo Logo"
              className="w-9 h-9 rounded-full border-2 border-[#EDE28E] shadow-[0_0_15px_rgba(237,226,142,0.4)] object-contain bg-[#EFF1F8] flex-shrink-0 group-hover:scale-105 transition-transform p-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wider text-white uppercase font-serif whitespace-nowrap">
                  PopoGo
                </h1>
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-full bg-[#EDE28E] text-[#0E2C9C] tracking-widest uppercase leading-none flex-shrink-0">
                  Puebla
                </span>
              </div>
              <p className="text-[10px] text-[#9597C1] hidden md:block font-medium truncate">
                {activeRoute === '/taller'
                  ? (language === 'es' ? 'Terminal de Mostrador para Talleres' : 'Workshop Counter Terminal')
                  : activeRoute === '/admin'
                  ? (language === 'es' ? 'Consola de Gestión Urbana • SECIHTI' : 'Urban Management Console • SECIHTI')
                  : (language === 'es' ? 'Caminatas Peatonales & Patrimonio Vivo' : 'Accessible Heritage Walks')}
              </p>
            </div>
          </div>

          {/* Controles de Cabecera: Perfil Activo, Intro Splash, Idioma y Cerrar Sesión */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Indicador del Rol y Perfil Autenticado */}
            {activeRoute === '/' && currentUser && (
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-[#EDE28E]/15 hover:bg-[#EDE28E]/25 border border-[#EDE28E]/40 text-[#EDE28E] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none shadow-sm flex-shrink-0"
                title={language === 'es' ? 'Ver Mi Récord y Bitácora' : 'View Records & Log'}
              >
                <Trophy className="w-3.5 h-3.5 text-[#EDE28E] flex-shrink-0" />
                <span className="max-w-[70px] sm:max-w-[120px] truncate">{currentUser.nickname}</span>
                <span className="text-[10px] bg-[#EDE28E] text-[#0E2C9C] px-1.5 py-0.5 rounded-full font-mono font-black flex-shrink-0 leading-none">
                  Nv.{currentUser.level}
                </span>
              </button>
            )}

            {activeRoute === '/taller' && artisanUser && (
              <div className="px-2.5 py-1.5 rounded-xl bg-[#9597C1]/20 border border-[#9597C1]/40 text-[#EFF1F8] text-xs font-bold flex items-center gap-1.5 select-none flex-shrink-0">
                <Store className="w-3.5 h-3.5 text-[#9597C1] flex-shrink-0" />
                <span className="max-w-[100px] sm:max-w-[180px] truncate">{artisanUser.workshopName}</span>
                <span className="w-2 h-2 rounded-full bg-[#EDE28E] animate-pulse ml-0.5 flex-shrink-0" />
              </div>
            )}

            {activeRoute === '/admin' && adminUser && (
              <div className="px-2.5 py-1.5 rounded-xl bg-[#7B5E86]/25 border border-[#7B5E86]/50 text-[#EFF1F8] text-xs font-bold flex items-center gap-1.5 select-none flex-shrink-0">
                <BarChart3 className="w-3.5 h-3.5 text-[#EDE28E] flex-shrink-0" />
                <span className="hidden sm:inline">SECIHTI • Gobierno de Puebla</span>
                <span className="sm:hidden">SECIHTI</span>
              </div>
            )}

            {/* Botón Ver Intro / Splash PopoGo */}
            <button
              type="button"
              onClick={() => setShowSplash(true)}
              className="p-1.5 px-2 sm:px-2.5 rounded-xl bg-[#0E2C9C] hover:bg-[#2544A7] text-[#EFF1F8] text-xs font-bold flex items-center gap-1.5 border border-[#EDE28E]/40 shadow-sm transition cursor-pointer flex-shrink-0"
              title={language === 'es' ? 'Ver video splash de PopoGo' : 'Watch PopoGo Splash Video'}
            >
              <PlayCircle className="w-3.5 h-3.5 text-[#EDE28E] flex-shrink-0" />
              <span className="hidden sm:inline">{language === 'es' ? 'Intro' : 'Intro'}</span>
            </button>

            {/* Selector de Idioma */}
            <button
              type="button"
              onClick={() => {
                const nextLang = language === 'es' ? 'en' : 'es';
                setLanguage(nextLang);
              }}
              className="p-1.5 px-2 sm:px-2.5 rounded-xl bg-[#07154E] hover:bg-[#0E2C9C] text-[#EFF1F8] text-xs font-bold flex items-center gap-1 border border-[#9597C1]/30 transition cursor-pointer flex-shrink-0"
            >
              <Languages className="w-3.5 h-3.5 text-[#EDE28E] flex-shrink-0" />
              <span>{language === 'es' ? 'EN' : 'ES'}</span>
            </button>

            {/* Botón Cerrar Sesión */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#7B5E86]/30 hover:bg-[#7B5E86]/50 text-[#EFF1F8] border border-[#7B5E86]/45 transition cursor-pointer flex-shrink-0 shadow-md flex items-center justify-center"
              title={language === 'es' ? 'Cerrar sesión' : 'Sign out'}
              aria-label={language === 'es' ? 'Cerrar sesión' : 'Sign out'}
            >
              <LogOut className="w-4 h-4 text-[#EDE28E] flex-shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Área Principal con Soporte para Vista Simulada 390x844 */}
      <main className="flex-1 w-full relative overflow-hidden flex items-center justify-center">
        <div
          className={
            viewportMode === 'mobile'
              ? 'w-full max-w-[390px] h-[844px] max-h-[calc(100vh-60px)] bg-slate-950 border-[5px] border-slate-800 rounded-[44px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden relative flex flex-col transition-all duration-500'
              : 'w-full h-full relative flex flex-col overflow-hidden transition-all duration-500'
          }
        >
          {viewportMode === 'mobile' && (
            <div className="h-6 w-full bg-slate-950 flex items-center justify-between px-6 z-40 select-none flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-400 font-bold">12:00</span>
              <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                <Radio className="w-3 h-3 text-sky-400" />
                <span>5G</span>
              </div>
            </div>
          )}

          {/* Vistas Cargadas con Code Splitting (React.lazy) según la Ruta Activa */}
          <Suspense
            fallback={
              <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-950">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
                    {language === 'es' ? 'Cargando módulo...' : 'Loading module...'}
                  </span>
                </div>
              </div>
            }
          >
            {activeRoute === '/' && (
              <VisitorView
                pois={pois}
                graph={graph}
                matrices={matrices}
                weights={weights}
                language={language}
                passportState={passportState}
                onUnlockSecret={handleUnlockSecret}
                userLocation={userLocation}
                onUserLocationChange={(coords) => setUserLocation(coords)}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenRecord={() => setIsRecordModalOpen(true)}
                onOpenDataInfo={() => setIsModalOpen(true)}
                onToggleLanguage={() => setLanguage((l) => (l === 'es' ? 'en' : 'es'))}
                onToggleViewport={() => setViewportMode((v) => (v === 'mobile' ? 'full' : 'mobile'))}
                viewportMode={viewportMode}
              />
            )}

            {activeRoute === '/taller' && (
              <ArtisanView
                pois={pois}
                language={language}
                onSessionChange={syncCurrentUser}
              />
            )}

            {activeRoute === '/admin' && (
              <AdminView
                pois={pois}
                graph={graph}
                matrices={matrices}
                weights={weights}
                language={language}
                onSessionChange={syncCurrentUser}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* Modal Interactivo de Selección de Rol */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-slide">
          <div className="bg-slate-900 border border-white/10 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  {language === 'es' ? 'Seleccionar Perfil de Vista' : 'Select View Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {(Object.keys(USER_ROLES) as UserRole[]).map((roleKey) => {
                const role = USER_ROLES[roleKey];
                const isSelected = currentRole === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleSelectRole(roleKey)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? `${role.theme.badgeBg} ${role.theme.badgeBorder} ring-1 ring-amber-400`
                        : 'bg-slate-950/70 border-white/5 hover:bg-slate-800'
                    }`}
                  >
                    <div className="mt-0.5">
                      {role.iconName === 'Compass' && <Compass className="w-5 h-5 text-amber-400" />}
                      {role.iconName === 'Store' && <Store className="w-5 h-5 text-sky-400" />}
                      {role.iconName === 'BarChart3' && (
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100">
                          {role.name[language]}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {role.description[language]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autenticación y Registro (Explorador, Artesano, Gobierno) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        pois={pois}
        language={language}
        onSessionChange={syncCurrentUser}
        onOpenRecord={() => setIsRecordModalOpen(true)}
      />

      {/* Modal de Mi Récord y Bitácora de Exploración */}
      <UserRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        currentUser={currentUser}
        passportState={passportState}
        pois={pois}
        language={language}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Modales de Transparencia y Celebración */}
      <DataInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        language={language}
      />

      {celebrationData && (
        <CelebrationModal
          isOpen={true}
          onClose={() => setCelebrationData(null)}
          badgeName={celebrationData.badgeName}
          title={celebrationData.title}
          description={celebrationData.description}
          zone={celebrationData.zone}
          language={language}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <MainApp />
    </RouterProvider>
  );
}
