import { useState, useMemo, useEffect, useRef, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import {
  Store,
  Clock,
  Award,
  Users,
  DollarSign,
  CheckCircle2,
  SmartphoneNfc,
  Flame,
  Copy,
  Check,
  History,
  Sparkles,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Radio,
  QrCode
} from 'lucide-react';
import {
  generateOfflineStampCode,
  buildNfcDeepLinkUrl,
  buildOfflineQrMatrix,
  isWebNfcSupported,
  writePhysicalNfcTag,
  startPhysicalNfcScan,
  emitLiveCounterStamp,
  getStampLedger,
  getWorkshopLiveStates,
  saveWorkshopLiveState,
  StampLedgerEntry,
  WorkshopLiveState
} from '../utils/offlineStamp';
import { tacticalAudio } from '../utils/tacticalAudio';

interface ArtisansPortalProps {
  pois: POI[];
  language: Language;
  activePoiId?: string;
}

export const ArtisansPortal: FC<ArtisansPortalProps> = ({
  pois,
  language,
  activePoiId
}) => {
  const localBusinesses = useMemo(
    () => pois.filter((p) => p.is_local_business && p.artisan_profile),
    [pois]
  );

  const [selectedPoiId, setSelectedPoiId] = useState<string>(
    activePoiId || localBusinesses[0]?.id || ''
  );

  useEffect(() => {
    if (activePoiId) {
      setSelectedPoiId(activePoiId);
    }
  }, [activePoiId]);

  const selectedPoi =
    localBusinesses.find((p) => p.id === selectedPoiId) || localBusinesses[0];
  const profile = selectedPoi?.artisan_profile;

  const [stampedSuccess, setStampedSuccess] = useState<string | null>(null);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [isWritingNfc, setIsWritingNfc] = useState(false);
  const [isTestingNfc, setIsTestingNfc] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [ledger, setLedger] = useState<StampLedgerEntry[]>([]);
  const [showNfcTools, setShowNfcTools] = useState(false);

  // Estado operativo en vivo del taller (Abierto / Demostración Activa / Pausa)
  const [liveStatus, setLiveStatus] = useState<'open' | 'live_demo' | 'closed'>('open');
  const [announcement, setAnnouncement] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState(false);

  const nfcAbortRef = useRef<AbortController | null>(null);

  const stopNfcHardware = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setIsWritingNfc(false);
    setIsTestingNfc(false);
  };

  useEffect(() => {
    return () => stopNfcHardware();
  }, []);

  // Cargar bitácora y estado operativo del taller activo
  useEffect(() => {
    if (!selectedPoi) return;
    stopNfcHardware();
    setNfcStatus(null);
    setNfcError(null);
    setLedger(getStampLedger(selectedPoi.id));

    const states = getWorkshopLiveStates();
    const current = states[selectedPoi.id];
    if (current) {
      setLiveStatus(current.status);
      setAnnouncement(current.announcement);
    } else {
      setLiveStatus('live_demo');
      setAnnouncement(selectedPoi.artisan_profile?.demostracion_en_vivo || '');
    }
  }, [selectedPoi]);

  const stampCode = useMemo(
    () => (selectedPoi ? generateOfflineStampCode(selectedPoi.id) : 'PUE-ALF'),
    [selectedPoi]
  );

  const deepLinkUrl = useMemo(
    () => (selectedPoi ? buildNfcDeepLinkUrl(selectedPoi.id) : ''),
    [selectedPoi]
  );

  const qrMatrix = useMemo(
    () => (deepLinkUrl ? buildOfflineQrMatrix(deepLinkUrl) : []),
    [deepLinkUrl]
  );

  const webNfcAvailable = useMemo(() => isWebNfcSupported(), []);

  // Cambio de estado operativo en 1 toque
  const handleStatusChange = (nextStatus: 'open' | 'live_demo' | 'closed') => {
    if (!selectedPoi) return;
    tacticalAudio.playTacticalClick();
    setLiveStatus(nextStatus);
    const payload: WorkshopLiveState = {
      poiId: selectedPoi.id,
      status: nextStatus,
      announcement,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    saveWorkshopLiveState(payload);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSaveAnnouncement = () => {
    if (!selectedPoi) return;
    tacticalAudio.playTacticalClick();
    const payload: WorkshopLiveState = {
      poiId: selectedPoi.id,
      status: liveStatus,
      announcement,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    saveWorkshopLiveState(payload);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  // Acción principal: Sellar visita en mostrador
  const handleIssueCounterStamp = () => {
    if (!selectedPoi || !profile) return;
    tacticalAudio.playStampSuccess();
    const entry = emitLiveCounterStamp(selectedPoi.id, selectedPoi.name);
    setLedger(getStampLedger(selectedPoi.id));
    setStampedSuccess(
      language === 'es'
        ? `¡Visita sellada con éxito! Pasaporte actualizado con el sello "${profile.sello_artesanal}" (${entry.code}).`
        : `Stamp issued! Visitor passport awarded "${profile.sello_artesanal}" (${entry.code}).`
    );
    setTimeout(() => setStampedSuccess(null), 4500);
  };

  // Programar etiqueta física NFC del mostrador
  const handleWriteNfcTag = async () => {
    if (!selectedPoi || !profile) return;
    tacticalAudio.playTacticalClick();

    if (isWritingNfc) {
      stopNfcHardware();
      setNfcStatus(null);
      return;
    }

    setNfcError(null);

    if (!webNfcAvailable) {
      setNfcError(
        language === 'es'
          ? 'Navegador sin hardware Web NFC directo. En iPhone o terminales externas puedes usar NFC Tools para vincular el enlace QR a la etiqueta.'
          : 'Web NFC not exposed in this browser. Use NFC Tools to link the tag to this workshop URL.'
      );
      return;
    }

    const ctrl = new AbortController();
    nfcAbortRef.current = ctrl;
    setIsWritingNfc(true);
    setNfcStatus(
      language === 'es'
        ? 'Acerca la etiqueta o sticker NFC al reverso de este dispositivo...'
        : 'Hold the physical NFC sticker against the back of this phone...'
    );

    const res = await writePhysicalNfcTag(selectedPoi.id, ctrl.signal);
    setIsWritingNfc(false);
    if (res.ok) {
      tacticalAudio.playStampSuccess();
      setNfcStatus(
        language === 'es'
          ? '¡Etiqueta NFC grabada con éxito! Ya puedes colocarla en tu mostrador o vitrina.'
          : 'NFC tag written successfully! Ready for your counter.'
      );
    } else if (!ctrl.signal.aborted) {
      setNfcStatus(null);
      setNfcError(res.error || (language === 'es' ? 'No se pudo grabar la etiqueta' : 'Failed to write tag'));
    }
  };

  // Probar / verificar etiqueta física NFC ya grabada
  const handleVerifyPhysicalTag = async () => {
    if (!selectedPoi) return;
    tacticalAudio.playTacticalClick();

    if (isTestingNfc) {
      stopNfcHardware();
      setNfcStatus(null);
      return;
    }

    setNfcError(null);
    if (!webNfcAvailable) {
      setNfcError(
        language === 'es'
          ? 'Lector Web NFC no disponible en este navegador.'
          : 'Web NFC reader not available in this browser.'
      );
      return;
    }

    const ctrl = new AbortController();
    nfcAbortRef.current = ctrl;
    setIsTestingNfc(true);
    setNfcStatus(
      language === 'es'
        ? 'Acerca la etiqueta NFC para verificar que corresponde a este taller...'
        : 'Tap your NFC tag to verify workshop match...'
    );

    await startPhysicalNfcScan({
      expectedPoiId: selectedPoi.id,
      signal: ctrl.signal,
      onValidRead: (verified) => {
        stopNfcHardware();
        tacticalAudio.playStampSuccess();
        setNfcStatus(
          language === 'es'
            ? `Etiqueta NFC verificada correctamente para "${selectedPoi.name}" (${verified.code || 'OK'}).`
            : `NFC tag verified for "${selectedPoi.name}" (${verified.code || 'OK'}).`
        );
      },
      onInvalidRead: (reason) => {
        setNfcError(
          language === 'es'
            ? `La etiqueta no corresponde a este taller (${reason}).`
            : `Tag does not match this workshop (${reason}).`
        );
      },
      onHardwareError: (err) => {
        stopNfcHardware();
        setNfcError(err);
      }
    });
  };

  const handleCopyCode = async () => {
    tacticalAudio.playTacticalClick();
    try {
      await navigator.clipboard.writeText(stampCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const stampsTodayCount = ledger.length;
  const unitTicketMxn = selectedPoi && selectedPoi.cost_mxn > 0 ? selectedPoi.cost_mxn : 85;
  const directSpendMxn = stampsTodayCount * unitTicketMxn;

  if (!selectedPoi || !profile) return null;

  return (
    <div className="space-y-4">
      {/* 1. FICHA SUPERIOR: IDENTIDAD Y ESTADO OPERATIVO EN VIVO */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30">
                {selectedPoi.zone.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400">
                {profile.maestro_artesano} • {profile.oficio}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {profile.nombre_taller}
            </h2>
          </div>

          {/* Selector de Estado Operativo de 1 toque */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleStatusChange('open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                liveStatus === 'open'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>{language === 'es' ? 'Abierto' : 'Open'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('live_demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                liveStatus === 'live_demo'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Demostración Activa' : 'Live Demo'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                liveStatus === 'closed'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Pausa' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* Aviso rápido para caminantes */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/10">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Aviso para visitantes hoy (ej. Torno abierto hasta las 14:00, esmaltado en vivo)...'
                  : 'Notice for visitors today...'
              }
              className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-slate-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveAnnouncement}
            className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            {savedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'es' ? 'Guardado' : 'Saved'}</span>
              </>
            ) : (
              <span>{language === 'es' ? 'Actualizar Aviso' : 'Update Notice'}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. REJILLA DE TRABAJO: ATENCIÓN AL VISITANTE (IZQ) Y MÉTRICAS / HISTORIAL (DER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* COLUMNA IZQUIERDA: MOSTRADOR DE ATENCIÓN Y SELLADO (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* BOTÓN PRIMARIO DE MOSTRADOR: SELLAR VISITA */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {language === 'es' ? 'Mostrador de Atención al Turista' : 'Visitor Greeting Station'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es'
                    ? `Sello oficial del taller: "${profile.sello_artesanal}"`
                    : `Workshop badge: "${profile.sello_artesanal}"`}
                </p>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>{language === 'es' ? 'Listo para Sellar' : 'Ready to Stamp'}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleIssueCounterStamp}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.3)] transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>
                {language === 'es'
                  ? 'SELLAR PASAPORTE DEL VISITANTE (1 TOQUE)'
                  : 'STAMP VISITOR PASSPORT (1 TAP)'}
              </span>
            </button>

            {stampedSuccess && (
              <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2.5 animate-fade-slide">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{stampedSuccess}</span>
              </div>
            )}

            {/* PANTALLA COMPARTIDA CON EL VISITANTE (QR Y CÓDIGO) */}
            <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2.5 bg-white rounded-xl flex-shrink-0 shadow-md">
                <svg
                  viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                  className="w-24 h-24 sm:w-28 sm:h-28"
                  shapeRendering="crispEdges"
                  aria-label={`QR ${stampCode}`}
                >
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width={1}
                          height={1}
                          fill="#0f172a"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {language === 'es'
                    ? 'Muestra este código al visitante o díctale el código corto:'
                    : 'Show this code to visitor or share this short key:'}
                </span>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-mono text-2xl font-black tracking-widest text-amber-400 bg-slate-900 px-3.5 py-1 rounded-xl border border-amber-500/30">
                    {stampCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 transition cursor-pointer"
                    title={language === 'es' ? 'Copiar código' : 'Copy code'}
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  {language === 'es'
                    ? 'El visitante puede escanear con su cámara, tocar tu etiqueta física NFC o escribir este código en su pasaporte.'
                    : 'Visitors can scan with their camera, tap physical NFC sticker, or enter this code in their passport.'}
                </p>
              </div>
            </div>

            {/* SECCIÓN DESPLEGABLE: VINCULAR ETIQUETA O STICKER NFC FÍSICO */}
            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/60">
              <button
                type="button"
                onClick={() => setShowNfcTools((v) => !v)}
                className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <SmartphoneNfc className="w-4 h-4 text-sky-400" />
                  <span>
                    {language === 'es'
                      ? 'Configurar Sticker NFC Físico del Mostrador'
                      : 'Physical Counter NFC Sticker Setup'}
                  </span>
                </span>
                {showNfcTools ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showNfcTools && (
                <div className="p-3.5 pt-0 space-y-3 border-t border-white/5">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'es'
                      ? 'Si tienes un sticker o medallón NFC en tu barra o vitrina, puedes vincularlo con 1 toque para que los visitantes solo acerquen su teléfono.'
                      : 'If you have a physical NFC sticker on your counter, tap below to program it so visitors can tap-and-go.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleWriteNfcTag}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        isWritingNfc
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/40 text-sky-300'
                      }`}
                    >
                      {isWritingNfc ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>{language === 'es' ? 'Cancelar Grabación' : 'Cancel Write'}</span>
                        </>
                      ) : (
                        <>
                          <SmartphoneNfc className="w-3.5 h-3.5" />
                          <span>{language === 'es' ? 'Grabar Chip NFC' : 'Write NFC Sticker'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyPhysicalTag}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        isTestingNfc
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-200'
                      }`}
                    >
                      {isTestingNfc ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>{language === 'es' ? 'Detener Prueba' : 'Stop Test'}</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'es' ? 'Probar Etiqueta Grabada' : 'Test NFC Sticker'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {nfcStatus && (
                    <div className="bg-slate-900 text-amber-300 text-xs p-2.5 rounded-xl flex items-center gap-2 border border-amber-500/30">
                      <SmartphoneNfc className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                      <span>{nfcStatus}</span>
                    </div>
                  )}

                  {nfcError && (
                    <div className="bg-rose-950/60 text-rose-300 text-xs p-2.5 rounded-xl flex items-start gap-2 border border-rose-500/40">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>{nfcError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: MÉTRICAS EN VIVO Y BITÁCORA DEL DÍA (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* TARJETAS DE IMPACTO EN EL TALLER */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'es' ? 'Visitantes Hoy' : 'Visitors Today'}</span>
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {stampsTodayCount}
              </div>
              <p className="text-[10px] text-slate-400">
                {language === 'es' ? 'Sellos otorgados' : 'Verified stamps'}
              </p>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'es' ? 'Derrama Estimada' : 'Direct Spend'}</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${directSpendMxn} <span className="text-xs font-normal">MXN</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {language === 'es' ? 'Consumo local directo' : 'Local commerce estimate'}
              </p>
            </div>
          </div>

          {/* BITÁCORA DE SELLOS EMITIDOS */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wide">
                <History className="w-3.5 h-3.5 text-amber-400" />
                {language === 'es' ? 'Visitas Registradas Hoy' : 'Visits Registered Today'}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {ledger.length} {language === 'es' ? 'sellos' : 'stamps'}
              </span>
            </div>

            {ledger.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 text-center text-xs text-slate-400 space-y-1">
                <Award className="w-5 h-5 text-slate-600 mx-auto" />
                <p>
                  {language === 'es'
                    ? 'Aún no hay visitas selladas en esta sesión.'
                    : 'No stamps recorded in this session yet.'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {language === 'es'
                    ? 'Pulsa el botón amarillo al recibir a un visitante.'
                    : 'Tap the yellow button when greeting a visitor.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {ledger.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div>
                        <span className="font-bold text-white block">
                          {language === 'es' ? 'Pasaporte Sellado' : 'Passport Stamped'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.method === 'web-nfc'
                            ? 'NFC Físico'
                            : item.method === 'live-counter'
                            ? 'Mostrador Directo'
                            : item.method === 'deep-link'
                            ? 'Enlace QR'
                            : 'Código Verificador'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FICHA TÉCNICA DEL TALLER */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-md space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-extrabold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                <Store className="w-3.5 h-3.5 text-sky-400" />
                {language === 'es' ? 'Ficha Patrimonial del Taller' : 'Workshop Heritage Profile'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {selectedPoi.entrance_accessible
                  ? language === 'es' ? 'Acceso Nivelado' : 'Step-free'
                  : language === 'es' ? 'Con Escalón' : 'Stepped'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-slate-100">{language === 'es' ? 'Técnica:' : 'Craft:'}</strong>{' '}
              {profile.tecnica_ancestral}
            </p>

            <div className="text-[11px] text-amber-300 font-medium">
              <strong>{language === 'es' ? 'Demostración en vivo:' : 'Live demo:'}</strong>{' '}
              {profile.horario_demostracion}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
