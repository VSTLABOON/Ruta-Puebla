import { useState, useEffect, useRef, useMemo, type FC } from 'react';
import { Language, PassportState, POI } from '@ruta-abierta/shared-types';
import {
  Trophy,
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
import { dbSync } from '../services/dbSync';

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

  const [walks, setWalks] = useState<WalkRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ruta_abierta_walk_records');
      return saved ? JSON.parse(saved) : DEFAULT_WALKS;
    } catch {
      return DEFAULT_WALKS;
    }
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedMeters, setRecordedMeters] = useState(0);
  const [newlyUnlockedNotice, setNewlyUnlockedNotice] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('ruta_abierta_walk_records', JSON.stringify(walks));
    } catch {}
  }, [walks]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        setRecordedMeters((prev) => prev + Math.floor(Math.random() * 2) + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const stats: ExplorerStats = useMemo(() => {
    const totalMeters =
      walks.reduce((acc, w) => acc + w.distanceMeters, 0) + (isRecording ? recordedMeters : 0);
    const totalTime =
      walks.reduce((acc, w) => acc + w.durationMinutes, 0) +
      Math.floor(elapsedSeconds / 60);
    const longestMeters = Math.max(
      ...walks.map((w) => w.distanceMeters),
      isRecording ? recordedMeters : 0,
      0
    );

    const unlockedPois = pois.filter((p) => passportState.unlocked_secrets.includes(p.id));
    const localSupported = unlockedPois.filter((p) => p.is_local_business).length;

    return {
      totalWalks: walks.length + (isRecording ? 1 : 0),
      totalKmWalked: Number((totalMeters / 1000).toFixed(2)),
      longestWalkKm: Number((longestMeters / 1000).toFixed(2)),
      totalTimeMinutes: totalTime,
      totalBadgesUnlocked: passportState.unlocked_secrets.length,
      localWorkshopsSupported: Math.max(localSupported, 3),
      co2SavedGrams: Math.round((totalMeters / 1000) * 145),
      currentStreakDays: 3,
      walksHistory: walks
    };
  }, [walks, isRecording, recordedMeters, elapsedSeconds, pois, passportState]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    tacticalAudio.playTacticalClick();
    setNewlyUnlockedNotice(null);
    setElapsedSeconds(0);
    setRecordedMeters(45);
    setIsRecording(true);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    tacticalAudio.playTacticalClick();
    setIsPaused((prev) => !prev);
  };

  const handleStopAndSave = () => {
    tacticalAudio.playStampSuccess();
    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    const finalMeters = Math.max(120, recordedMeters);
    const newWalk: WalkRecord = {
      id: `walk_${Date.now()}`,
      title:
        language === 'es'
          ? `Caminata por el Centro (${new Date().toLocaleDateString()})`
          : `Historic Center Walk (${new Date().toLocaleDateString()})`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      durationMinutes: durationMin,
      distanceMeters: finalMeters,
      stopsVisited: Math.max(1, Math.floor(finalMeters / 400)),
      badgesEarned: 1,
      zone: 'Centro Histórico y Barrios'
    };

    setWalks((prev) => [newWalk, ...prev]);
    if (currentUser?.id) dbSync.saveWalkRecord(newWalk, currentUser.id);
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setRecordedMeters(0);
    setNewlyUnlockedNotice(
      language === 'es'
        ? `¡Caminata guardada! Sumaste ${(finalMeters / 1000).toFixed(2)} km a tu historial.`
        : `Walk saved! Added ${(finalMeters / 1000).toFixed(2)} km to your history.`
    );
    setActiveTab('history');
  };

  const handleExportRecords = () => {
    tacticalAudio.playTacticalClick();
    const payload = {
      user: currentUser || { name: 'Visitante', role: 'tourist' },
      exportedAt: new Date().toISOString(),
      stats,
      walks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis_caminatas_puebla_${Date.now()}.json`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1E4A]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-slide">
      <div className="bg-[#FAF6EE] border-t-4 sm:border-4 border-[#0F3078] text-[#162035] rounded-t-[28px] sm:rounded-3xl max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* 1. Cabecera fija */}
        <header className="px-5 py-3.5 bg-[#0F3078] text-[#FAF6EE] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-[#F0B43A]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-sm sm:text-base text-[#FAF6EE] truncate">
                  {language === 'es' ? 'Mi Progreso' : 'My Progress'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0B43A] text-[#0A1E4A] flex-shrink-0">
                  {currentUser ? `Nivel ${currentUser.level}` : 'Nivel 1'}
                </span>
              </div>
              <p className="text-[11px] text-[#DCE6F9] truncate">
                {currentUser
                  ? `${currentUser.name} (@${currentUser.nickname})`
                  : language === 'es'
                  ? 'Resumen de tus recorridos y sellos'
                  : 'Summary of your walks and stamps'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer flex-shrink-0"
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Control segmentado unificado */}
        <div className="px-4 py-2.5 bg-[#F2EBDC] border-b border-[#0F3078]/15 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-white/80 p-1 rounded-xl border border-[#0F3078]/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('records');
              }}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Resumen' : 'Summary'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('tracker');
              }}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'tracker'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isRecording
                  ? '● En curso'
                  : language === 'es'
                  ? 'Cronómetro'
                  : 'Timer'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('history');
              }}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Historial' : 'History'}</span>
            </button>
          </div>
        </div>

        {/* 3. Cuerpo con scroll independiente */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {newlyUnlockedNotice && (
            <div className="p-3 rounded-2xl bg-[#1D6B52]/10 border border-[#1D6B52]/30 text-[#1D6B52] text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>{newlyUnlockedNotice}</span>
            </div>
          )}

          {/* PESTAÑA 1: RESUMEN */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              {/* Indicadores principales (KPI Strip) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#162035]/70 font-semibold">
                    <span>{language === 'es' ? 'Mayor distancia' : 'Longest walk'}</span>
                    <Footprints className="w-4 h-4 text-[#1D6B52]" />
                  </div>
                  <div className="text-xl font-black text-[#0F3078] font-mono">
                    {stats.longestWalkKm} <span className="text-xs font-normal text-[#162035]/70">km</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#162035]/70 font-semibold">
                    <span>{language === 'es' ? 'Tiempo total' : 'Total time'}</span>
                    <Clock className="w-4 h-4 text-[#0F3078]" />
                  </div>
                  <div className="text-xl font-black text-[#0F3078] font-mono">
                    {stats.totalTimeMinutes} <span className="text-xs font-normal text-[#162035]/70">min</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#162035]/70 font-semibold">
                    <span>{language === 'es' ? 'Sellos obtenidos' : 'Stamps collected'}</span>
                    <Award className="w-4 h-4 text-[#B84A2C]" />
                  </div>
                  <div className="text-xl font-black text-[#B84A2C] font-mono">
                    {stats.totalBadgesUnlocked}{' '}
                    <span className="text-xs font-normal text-[#162035]/70">/ {pois.length}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#162035]/70 font-semibold">
                    <span>{language === 'es' ? 'Talleres visitados' : 'Workshops visited'}</span>
                    <Store className="w-4 h-4 text-[#D48914]" />
                  </div>
                  <div className="text-xl font-black text-[#0F3078] font-mono">
                    {stats.localWorkshopsSupported}
                  </div>
                </div>
              </div>

              {/* Barra de progreso al siguiente nivel */}
              <div className="p-4 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F3078] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D48914]" />
                    {language === 'es' ? 'Avance de nivel' : 'Level progress'}
                  </span>
                  <span className="text-[11px] font-semibold text-[#162035]/70">
                    {stats.totalKmWalked} / 5.0 km
                  </span>
                </div>
                <div className="w-full bg-[#F2EBDC] rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#0F3078] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (stats.totalKmWalked / 5) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: CRONÓMETRO */}
          {activeTab === 'tracker' && (
            <div className="space-y-4 text-center py-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#0F3078]/20 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRecording && !isPaused
                      ? 'bg-[#B84A2C] animate-ping'
                      : isPaused
                      ? 'bg-[#D48914]'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="font-bold text-[11px] text-[#0F3078]">
                  {isRecording
                    ? isPaused
                      ? language === 'es'
                        ? 'En pausa'
                        : 'Paused'
                      : language === 'es'
                      ? 'Registrando caminata'
                      : 'Recording walk'
                    : language === 'es'
                    ? 'Listo para iniciar'
                    : 'Ready to start'}
                </span>
              </div>

              <div className="py-5 px-6 rounded-2xl bg-white border-2 border-[#0F3078]/20 shadow-xs max-w-xs mx-auto space-y-3">
                <div className="text-4xl sm:text-5xl font-mono font-black text-[#0F3078] tracking-wider">
                  {formatTimer(elapsedSeconds)}
                </div>
                <div className="flex items-center justify-center gap-6 text-xs pt-2 border-t border-[#0F3078]/10">
                  <div>
                    <span className="text-[10px] block uppercase text-[#162035]/60 font-semibold">
                      {language === 'es' ? 'Distancia' : 'Distance'}
                    </span>
                    <strong className="text-[#0F3078] text-sm font-mono">{recordedMeters} m</strong>
                  </div>
                  <div className="w-px h-6 bg-[#0F3078]/15" />
                  <div>
                    <span className="text-[10px] block uppercase text-[#162035]/60 font-semibold">
                      {language === 'es' ? 'Paso promedio' : 'Avg pace'}
                    </span>
                    <strong className="text-[#1D6B52] text-sm font-mono">~4.2 km/h</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: HISTORIAL */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {walks.map((walk) => (
                <div
                  key={walk.id}
                  className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-[#0F3078]">{walk.title}</div>
                    <span className="text-[10px] font-mono text-[#162035]/60 flex-shrink-0">
                      {walk.date}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#162035]/80">
                    <span className="flex items-center gap-1 text-[#1D6B52] font-bold">
                      <Footprints className="w-3.5 h-3.5" />
                      {(walk.distanceMeters / 1000).toFixed(2)} km
                    </span>
                    <span className="flex items-center gap-1 text-[#0F3078] font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {walk.durationMinutes} min
                    </span>
                    <span className="text-[11px] text-[#162035]/60">{walk.zone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Footer fijo con acciones claras */}
        <footer className="p-3.5 sm:px-5 bg-white border-t border-[#0F3078]/15 flex items-center justify-between gap-2.5 flex-shrink-0">
          {!currentUser && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="py-2.5 px-3.5 rounded-xl bg-[#F2EBDC] hover:bg-[#E5DEC9] text-[#0F3078] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{language === 'es' ? 'Guardar en mi cuenta' : 'Save to account'}</span>
            </button>
          )}

          {activeTab === 'records' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('tracker');
                handleStartRecording();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{language === 'es' ? 'Registrar nueva caminata' : 'Record new walk'}</span>
            </button>
          )}

          {activeTab === 'tracker' && (
            <div className="flex-1 flex items-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{language === 'es' ? 'Iniciar cronómetro' : 'Start timer'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePauseResume}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#F2EBDC] hover:bg-[#E5DEC9] text-[#0F3078] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                    <span>
                      {isPaused
                        ? language === 'es'
                          ? 'Continuar'
                          : 'Resume'
                        : language === 'es'
                        ? 'Pausar'
                        : 'Pause'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAndSave}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1D6B52] hover:bg-[#15533F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>{language === 'es' ? 'Guardar recorrido' : 'Save walk'}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <button
              type="button"
              onClick={handleExportRecords}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'es' ? 'Descargar historial' : 'Download history'}</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
