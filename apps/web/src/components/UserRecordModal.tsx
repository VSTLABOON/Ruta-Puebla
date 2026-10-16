import { useState, useEffect, useRef, useMemo, type FC } from 'react';
import { Language, PassportState, POI } from '@ruta-abierta/shared-types';
import {
  Trophy,
  Flame,
  Clock,
  Footprints,
  Award,
  Store,
  Play,
  Pause,
  Square,
  Sparkles,
  Download,
  Calendar,
  X,
  UserCheck
} from 'lucide-react';
import { UserProfile, WalkRecord, ExplorerStats } from '../types/userRecord';
import { tacticalAudio } from '../utils/tacticalAudio';

interface UserRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  passportState: PassportState;
  pois: POI[];
  language: Language;
  onOpenAuth: () => void;
}

const DEFAULT_WALKS: WalkRecord[] = [
  {
    id: 'walk_01',
    title: 'Ruta de los Hornos y Callejón de la Alfarería',
    date: '2026-10-14 11:30',
    durationMinutes: 48,
    distanceMeters: 1850,
    stopsVisited: 4,
    badgesEarned: 2,
    zone: 'Barrio de La Luz'
  },
  {
    id: 'walk_02',
    title: 'Circuito Talavera y Casonas Virreinales',
    date: '2026-10-15 16:15',
    durationMinutes: 62,
    distanceMeters: 2420,
    stopsVisited: 5,
    badgesEarned: 3,
    zone: 'Barrio de Analco'
  }
];

export const UserRecordModal: FC<UserRecordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  passportState,
  pois,
  language,
  onOpenAuth
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'tracker' | 'history'>('records');

  // Historial de caminatas guardadas en localStorage
  const [walks, setWalks] = useState<WalkRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_walk_records');
      return saved ? JSON.parse(saved) : DEFAULT_WALKS;
    } catch {
      return DEFAULT_WALKS;
    }
  });

  // Estado del grabador en vivo (Live Track Recorder)
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedMeters, setRecordedMeters] = useState(0);
  const [newlyUnlockedNotice, setNewlyUnlockedNotice] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // Guardar historial en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ruta_abierta_walk_records', JSON.stringify(walks));
    } catch {}
  }, [walks]);

  // Temporizador del grabador
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        // Simulación de avance peatonal táctico ~1.1 m por segundo
        setRecordedMeters((prev) => prev + Math.floor(Math.random() * 2) + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Cálculos de estadísticas y récords acumulados
  const stats: ExplorerStats = useMemo(() => {
    const totalMeters = walks.reduce((acc, w) => acc + w.distanceMeters, 0);
    const longestMeters = walks.reduce((max, w) => Math.max(max, w.distanceMeters), 0);
    const totalMinutes = walks.reduce((acc, w) => acc + w.durationMinutes, 0);
    const supportedWorkshops = pois.filter(
      (p) => p.is_local_business && passportState.unlocked_secrets.includes(p.id)
    ).length;

    return {
      totalKmWalked: Number((totalMeters / 1000).toFixed(2)),
      longestWalkKm: Number((longestMeters / 1000).toFixed(2)),
      totalTimeMinutes: totalMinutes,
      totalBadgesUnlocked: passportState.unlocked_secrets.length,
      localWorkshopsSupported: Math.max(supportedWorkshops, 2),
      walksHistory: walks
    };
  }, [walks, pois, passportState.unlocked_secrets]);

  // Formato del cronómetro
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    tacticalAudio.playTacticalClick();
    setIsRecording(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setRecordedMeters(0);
    setNewlyUnlockedNotice(null);
  };

  const handlePauseResume = () => {
    tacticalAudio.playTacticalClick();
    setIsPaused((p) => !p);
  };

  const handleStopAndSave = () => {
    if (elapsedSeconds < 5 && recordedMeters < 10) {
      setIsRecording(false);
      setIsPaused(false);
      return;
    }

    tacticalAudio.playStampSuccess();
    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    const newWalk: WalkRecord = {
      id: `walk_${Date.now()}`,
      title: `${language === 'es' ? 'Recorrido Peatonal Registrado' : 'Recorded Walking Tour'} #${walks.length + 1}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      durationMinutes: durationMin,
      distanceMeters: recordedMeters,
      stopsVisited: Math.max(1, Math.round(recordedMeters / 600)),
      badgesEarned: Math.min(2, Math.floor(recordedMeters / 800)),
      zone: 'Centro Histórico & Barrios'
    };

    setWalks((prev) => [newWalk, ...prev]);
    setIsRecording(false);
    setIsPaused(false);
    setNewlyUnlockedNotice(
      language === 'es'
        ? `¡Nuevo récord guardado! +${(recordedMeters / 1000).toFixed(2)} km añadidos a tu bitácora.`
        : `New record saved! +${(recordedMeters / 1000).toFixed(2)} km added to your log.`
    );
  };

  const handleExportRecords = () => {
    const payload = {
      user: currentUser || { nickname: 'Explorador Anónimo', role: 'tourist' },
      stats,
      passport: {
        unlockedCount: passportState.unlocked_secrets.length,
        secrets: passportState.unlocked_secrets
      },
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record_caminatas_puebla_${Date.now()}.json`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-slide">
      <div className="bg-slate-900 border border-white/15 text-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera del Récord */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {language === 'es' ? 'Mi Récord de Exploración' : 'My Explorer Record'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                  {currentUser ? `Nivel ${currentUser.level}` : 'Nivel 1'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {currentUser
                  ? `${currentUser.name} (${currentUser.nickname})`
                  : language === 'es'
                  ? 'Bitácora y mejores marcas peatonales'
                  : 'Walking log & personal best records'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!currentUser && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Login' : 'Login'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector de Pestañas: Récord, Grabar Recorrido, Bitácora */}
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-slate-950/80 border-b border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('records');
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'records'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Récords' : 'Records'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('tracker');
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>
              {isRecording ? '● REC' : language === 'es' ? 'Grabar Ruta' : 'Record Walk'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              tacticalAudio.playTacticalClick();
              setActiveTab('history');
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Bitácora' : 'Log'}</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {newlyUnlockedNotice && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-slide">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{newlyUnlockedNotice}</span>
            </div>
          )}

          {/* PESTAÑA 1: TABLERO DE RÉCORDS Y MEJORES MARCAS */}
          {activeTab === 'records' && (
            <div className="space-y-4 animate-fade-slide">
              {/* Tarjeta de Nivel y Barra de Experiencia */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-sky-500/15 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {language === 'es' ? 'Rango de Exploración' : 'Explorer Rank'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-300">
                    {stats.totalKmWalked > 3 ? 'Guardián del Patrimonio' : 'Caminante Inicial'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 via-amber-500 to-sky-400 h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (stats.totalKmWalked / 5) * 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{stats.totalKmWalked} km acumulados</span>
                  <span>Meta: 5.0 km (Nivel Siguiente)</span>
                </div>
              </div>

              {/* Grid 2x2 de Récords Personales */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span>{language === 'es' ? 'Récord Caminata' : 'Longest Walk'}</span>
                    <Footprints className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.longestWalkKm} <span className="text-xs text-slate-400 font-normal">km</span>
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    {language === 'es' ? 'Tu mayor distancia continua' : 'Longest single session'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span>{language === 'es' ? 'Tiempo en Ruta' : 'Total Time'}</span>
                    <Clock className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.totalTimeMinutes} <span className="text-xs text-slate-400 font-normal">min</span>
                  </div>
                  <div className="text-[10px] text-sky-400">
                    {language === 'es' ? 'Explorando a pie en Puebla' : 'Walking historic center'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span>{language === 'es' ? 'Sellos Ganados' : 'Stamps Unlocked'}</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.totalBadgesUnlocked} <span className="text-xs text-slate-400 font-normal">/ {pois.length}</span>
                  </div>
                  <div className="text-[10px] text-amber-400">
                    {language === 'es' ? 'Insignias en pasaporte' : 'In cultural passport'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span>{language === 'es' ? 'Talleres Locales' : 'Local Artisans'}</span>
                    <Store className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.localWorkshopsSupported}
                  </div>
                  <div className="text-[10px] text-violet-400">
                    {language === 'es' ? 'Microtalleres apoyados' : 'DENUE workshops visited'}
                  </div>
                </div>
              </div>

              {/* Acceso Rápido a Iniciar Grabación */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-white">
                    {language === 'es' ? '¿Listo para una nueva caminata?' : 'Ready for a new walk?'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'es'
                      ? 'Activa el cronómetro y GPS táctico para superar tu récord de distancia.'
                      : 'Record live steps & distance to break your personal record.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tracker');
                    handleStartRecording();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition flex-shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'es' ? 'Iniciar' : 'Start'}</span>
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: GRABADOR DE RUTA EN TIEMPO REAL (LIVE TRACK RECORDER) */}
          {activeTab === 'tracker' && (
            <div className="space-y-5 animate-fade-slide text-center py-2">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-white/10 text-xs">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isRecording && !isPaused
                        ? 'bg-rose-500 animate-ping'
                        : isPaused
                        ? 'bg-amber-500'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-mono uppercase font-bold text-[11px] text-slate-200">
                    {isRecording
                      ? isPaused
                        ? language === 'es'
                          ? 'Grabación Pausada'
                          : 'Recording Paused'
                        : language === 'es'
                        ? 'Grabando Recorrido en Vivo'
                        : 'Recording Live Track'
                      : language === 'es'
                      ? 'Grabador Listo'
                      : 'Recorder Ready'}
                  </span>
                </div>
              </div>

              {/* Display Gigante del Cronómetro */}
              <div className="py-4 px-6 rounded-3xl bg-slate-950 border border-white/10 shadow-inner max-w-xs mx-auto space-y-2">
                <div className="text-4xl sm:text-5xl font-mono font-black text-amber-400 tracking-wider">
                  {formatTimer(elapsedSeconds)}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] block uppercase text-slate-500">
                      {language === 'es' ? 'Distancia' : 'Distance'}
                    </span>
                    <strong className="text-white text-sm">{recordedMeters} m</strong>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[10px] block uppercase text-slate-500">
                      {language === 'es' ? 'Ritmo' : 'Pace'}
                    </span>
                    <strong className="text-emerald-400 text-sm">~4.2 km/h</strong>
                  </div>
                </div>
              </div>

              {/* Botonera de Control Táctico */}
              <div className="flex items-center justify-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:brightness-110 text-white font-extrabold text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.4)] transition cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>{language === 'es' ? 'Comenzar a Grabar' : 'Start Recording'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handlePauseResume}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                      <span>
                        {isPaused
                          ? language === 'es'
                            ? 'Reanudar'
                            : 'Resume'
                          : language === 'es'
                          ? 'Pausar'
                          : 'Pause'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStopAndSave}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>{language === 'es' ? 'Guardar Récord' : 'Save Record'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: BITÁCORA HISTÓRICA */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-fade-slide">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  {language === 'es' ? 'Caminatas Guardadas' : 'Saved Walking Logs'} ({walks.length})
                </span>
                <button
                  type="button"
                  onClick={handleExportRecords}
                  className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Exportar JSON' : 'Export JSON'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {walks.map((walk) => (
                  <div
                    key={walk.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-1.5 hover:border-amber-500/30 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-white">{walk.title}</div>
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                        {walk.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Footprints className="w-3 h-3" />
                        {(walk.distanceMeters / 1000).toFixed(2)} km
                      </span>
                      <span className="flex items-center gap-1 text-sky-400">
                        <Clock className="w-3 h-3" />
                        {walk.durationMinutes} min
                      </span>
                      <span className="text-slate-500 text-[11px] font-sans">
                        {walk.zone}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
