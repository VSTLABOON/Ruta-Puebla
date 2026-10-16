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
  LogOut
} from 'lucide-react';
import { tacticalAudio } from './utils/tacticalAudio';
import { applyPaper, readPaper, type Paper } from './utils/paperTheme';
import { RouterProvider, useRouter } from './router/Router';
import { verifyOfflineStampPayload, recordStampInLedger } from './utils/offlineStamp';
import { SplashScreen } from './components/SplashScreen';
import { TalaveraFrieze, TalaveraPlateMedallion } from './components/TalaveraOrnament';

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

  // Papel talavera: claro / oscuro (misma clave que el login)
  const [paper] = useState<Paper>(() => readPaper());
  useEffect(() => {
    applyPaper(paper);
  }, [paper]);

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
  const [language, setLanguage] = useState<'es' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_lang');
      if (saved === 'es' || saved === 'en') return saved;
      if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
      }
    } catch {}
    return 'es';
  });

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'es' ? 'en' : 'es';
      try {
        localStorage.setItem('ruta_abierta_lang', next);
      } catch {}
      return next;
    });
  };

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

  if (showSplash || isLoading) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        isLoadingData={isLoading}
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
    <div className="h-screen w-screen overflow-hidden talavera-bg-pattern text-[#162035] flex flex-col font-sans antialiased selection:bg-[#0F3078] selection:text-[#FAF6EE]">
      {/* Cabecera Principal PopoGo estilo Azulejo de Talavera con Cenefa Policroma */}
      <header className="talavera-cobalt-pattern text-[#FAF6EE] z-40 flex-shrink-0 shadow-md">
        <div className="w-full px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo en Medallón de Plato de Talavera y Nombre PopoGo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group min-w-0"
          >
            <TalaveraPlateMedallion size="sm" variant="polychrome" className="flex-shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/popogo-logo.png"
                alt="PopoGo Logo"
                className="w-5 h-5 rounded-full object-contain"
              />
            </TalaveraPlateMedallion>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wider text-[#FAF6EE] uppercase font-serif whitespace-nowrap">
                  PopoGo
                </h1>
                <span className="text-[10px] font-sans font-extrabold px-2 py-0.5 rounded-full bg-[#B84A2C] text-[#FAF6EE] border border-[#F0B43A] tracking-widest uppercase leading-none flex-shrink-0 shadow-sm">
                  Puebla
                </span>
              </div>
              <p className="text-[10px] text-[#DCE6F9] hidden md:block font-medium truncate">
                {activeRoute === '/taller'
                  ? (language === 'es' ? 'Terminal de Mostrador • Talleres de Talavera y Alfarería' : 'Workshop Counter Terminal')
                  : activeRoute === '/admin'
                  ? (language === 'es' ? 'Consola de Gestión Urbana • SECIHTI Puebla' : 'Urban Management Console • SECIHTI')
                  : (language === 'es' ? 'Rutas Peatonales, Talavera & Patrimonio Vivo' : 'Accessible Heritage Walks')}
              </p>
            </div>
          </div>

          {/* Controles de Cabecera en Marfil Majólica y Terracota */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleToggleLanguage}
              className="p-1.5 px-2.5 rounded-xl bg-[#FAF6EE] hover:bg-white text-[#0F3078] text-xs font-extrabold flex items-center gap-1.5 border-2 border-[#D48914] transition cursor-pointer flex-shrink-0 active:scale-95 shadow-sm"
              title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
              <Languages className="w-3.5 h-3.5 text-[#B84A2C] flex-shrink-0" />
              <span className="font-mono text-xs font-black">{language === 'es' ? 'EN' : 'ES'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 px-2.5 rounded-xl bg-[#B84A2C] hover:bg-[#9E3B20] text-[#FAF6EE] border border-[#F0B43A] transition cursor-pointer flex-shrink-0 active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
              title={language === 'es' ? 'Cerrar sesión' : 'Sign out'}
              aria-label={language === 'es' ? 'Cerrar sesión' : 'Sign out'}
            >
              <LogOut className="w-3.5 h-3.5 text-[#F0B43A] flex-shrink-0" />
              <span className="hidden sm:inline text-xs font-extrabold">{language === 'es' ? 'Salir' : 'Sign out'}</span>
            </button>
          </div>
        </div>
        <TalaveraFrieze compact />
      </header>

      {/* Área Principal con Soporte para Vista Simulada 390x844 */}
      <main className="flex-1 w-full relative overflow-hidden flex items-center justify-center">
        <div
          className={
            viewportMode === 'mobile'
              ? 'w-full max-w-[390px] h-[844px] max-h-[calc(100vh-64px)] bg-[#FAF6EE] border-[5px] border-[#0F3078] rounded-[44px] shadow-[0_25px_80px_rgba(10,30,74,0.45)] overflow-hidden relative flex flex-col transition-all duration-500'
              : 'w-full h-full relative flex flex-col overflow-hidden transition-all duration-500'
          }
        >
          {viewportMode === 'mobile' && (
            <div className="h-6 w-full bg-[#0F3078] flex items-center justify-between px-6 z-40 select-none flex-shrink-0">
              <span className="text-[10px] font-mono text-[#FAF6EE] font-bold">12:00</span>
              <div className="w-20 h-4 bg-[#0A1E4A] rounded-full border border-[#3E6FD1]/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#F0B43A] animate-pulse" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#FAF6EE]">
                <Radio className="w-3 h-3 text-[#F0B43A]" />
                <span>5G</span>
              </div>
            </div>
          )}

          {/* Vistas Cargadas con Code Splitting (React.lazy) según la Ruta Activa */}
          <Suspense
            fallback={
              <div className="flex-1 w-full h-full flex items-center justify-center talavera-bg-pattern">
                <div className="text-center space-y-3 talavera-plate-card p-6 rounded-3xl">
                  <div className="w-10 h-10 border-4 border-[#0F3078] border-t-[#B84A2C] rounded-full animate-spin mx-auto" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F3078] block font-serif">
                    {language === 'es' ? 'Cargando azulejos y rutas...' : 'Loading module...'}
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
        <div className="fixed inset-0 z-50 bg-[#0A1E4A]/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-slide">
          <div className="talavera-plate-card text-[#162035] rounded-3xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0F3078]/15">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0F3078]" />
                <h3 className="font-extrabold text-sm text-[#0F3078] uppercase tracking-wide font-serif">
                  {language === 'es' ? 'Seleccionar Perfil de Vista' : 'Select View Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[#0F3078] hover:bg-[#DCE6F9] p-1 rounded-lg cursor-pointer"
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
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all duration-300 flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F3078] text-[#FAF6EE] border-[#D48914] shadow-md'
                        : 'bg-[#FFFDF9] border-[#0F3078]/20 hover:border-[#0F3078] text-[#162035]'
                    }`}
                  >
                    <div className="mt-0.5">
                      {role.iconName === 'Compass' && <Compass className={`w-5 h-5 ${isSelected ? 'text-[#F0B43A]' : 'text-[#0F3078]'}`} />}
                      {role.iconName === 'Store' && <Store className={`w-5 h-5 ${isSelected ? 'text-[#F0B43A]' : 'text-[#B84A2C]'}`} />}
                      {role.iconName === 'BarChart3' && (
                        <BarChart3 className={`w-5 h-5 ${isSelected ? 'text-[#F0B43A]' : 'text-[#1D6B52]'}`} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-extrabold text-sm ${isSelected ? 'text-[#FAF6EE]' : 'text-[#0F3078]'}`}>
                          {role.name[language]}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#F0B43A]" />}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-[#DCE6F9]' : 'text-[#162035]/75'}`}>
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

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PopoGo RootErrorBoundary capturó una excepción:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F2EBDC] text-[#162035] font-sans">
          <div className="w-full max-w-lg bg-[#FAF6EE] border-4 border-[#0F3078] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-[#0F3078]/20 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#B84A2C] text-[#FAF6EE] flex items-center justify-center font-bold font-serif text-lg">
                !
              </div>
              <div>
                <h2 className="text-base font-black text-[#0F3078] font-serif uppercase">
                  Error de Inicialización en PopoGo
                </h2>
                <p className="text-xs text-[#162035]/70">
                  Ocurrió un error inesperado al renderizar la vista.
                </p>
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#0F3078]/30 rounded-xl p-3 text-xs font-mono text-[#B84A2C] overflow-auto max-h-48 whitespace-pre-wrap select-all">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </div>

            {this.state.errorInfo?.componentStack && (
              <div className="bg-[#FFFDF9] border border-[#0F3078]/30 rounded-xl p-3 text-[11px] font-mono text-[#162035]/80 overflow-auto max-h-36 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-extrabold text-xs transition cursor-pointer"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 rounded-xl bg-[#B84A2C] hover:bg-[#9E3B20] text-[#FAF6EE] font-extrabold text-xs transition cursor-pointer"
              >
                Reiniciar Datos Locales
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <RootErrorBoundary>
      <RouterProvider>
        <MainApp />
      </RouterProvider>
    </RootErrorBoundary>
  );
}

