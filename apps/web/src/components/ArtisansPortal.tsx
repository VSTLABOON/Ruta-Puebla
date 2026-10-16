import { useState, useMemo, useEffect, useRef, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import {
  Hammer,
  Clock,
  Award,
  Users,
  DollarSign,
  CheckCircle2,
  QrCode,
  SmartphoneNfc,
  WifiOff,
  Flame,
  Copy,
  Check,
  Radio,
  History,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import {
  generateOfflineStampCode,
  generateStampSignature,
  buildNfcTextPayload,
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

  // Sincronizar automáticamente cuando el dueño inicia sesión o cambia de sucursal en ArtisanView
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
  const [copiedField, setCopiedField] = useState<'code' | 'url' | 'ndef' | null>(null);
  const [ledger, setLedger] = useState<StampLedgerEntry[]>([]);

  // Estado operativo en vivo del taller (Abierto / Horno Activo / Cerrado)
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

  // Cargar bitácora real y estado operativo del taller seleccionado
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
    () => (selectedPoi ? generateOfflineStampCode(selectedPoi.id) : 'PUE-2026'),
    [selectedPoi]
  );

  const stampSignature = useMemo(
    () => (selectedPoi ? generateStampSignature(selectedPoi.id, stampCode) : ''),
    [selectedPoi, stampCode]
  );

  const ndefTextPayload = useMemo(
    () => (selectedPoi ? buildNfcTextPayload(selectedPoi.id) : ''),
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

  // Actualizar estado operativo del local con 1 toque
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

  // Acción #1 de Mostrador: Emitir Sello en Vivo (1 clic) -> Desbloquea al visitante y registra en bitácora
  const handleIssueCounterStamp = () => {
    if (!selectedPoi || !profile) return;
    tacticalAudio.playStampSuccess();
    const entry = emitLiveCounterStamp(selectedPoi.id, selectedPoi.name);
    setLedger(getStampLedger(selectedPoi.id));
    setStampedSuccess(
      language === 'es'
        ? `Folio ${entry.id.slice(-6).toUpperCase()} • Sello "${profile.sello_artesanal}" transmitido al visitante (${entry.code})`
        : `Folio ${entry.id.slice(-6).toUpperCase()} • Stamp "${profile.sello_artesanal}" sent to visitor (${entry.code})`
    );
    setTimeout(() => setStampedSuccess(null), 5000);
  };

  // Acción #2: Grabar Etiqueta NFC Física (NTAG213 / NTAG215) con NDEF URI + Text Record
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
          ? 'Tu navegador actual no incluye hardware Web NFC (disponible en Chrome para Android). Usa los botones de abajo para copiar el Enlace NDEF URI o Payload y grabarlo con NFC Tools en iOS/Android.'
          : 'Your current browser does not expose Web NFC hardware (available on Chrome for Android). Use the copy buttons below to program tags with NFC Tools.'
      );
      return;
    }

    const ctrl = new AbortController();
    nfcAbortRef.current = ctrl;
    setIsWritingNfc(true);
    setNfcStatus(
      language === 'es'
        ? 'Acerca una etiqueta física NFC (NTAG213/215) al reverso de este dispositivo para grabar la firma del taller...'
        : 'Hold a physical NFC tag (NTAG213/215) against the back of this device to write the workshop signature...'
    );

    const res = await writePhysicalNfcTag(selectedPoi.id, ctrl.signal);
    setIsWritingNfc(false);
    if (res.ok) {
      tacticalAudio.playStampSuccess();
      setNfcStatus(
        language === 'es'
          ? `¡Etiqueta física NFC grabada con éxito! Contiene URI universal + token firmado (${res.code}).`
          : `Physical NFC tag written! Contains universal URI + signed token (${res.code}).`
      );
    } else if (!ctrl.signal.aborted) {
      setNfcStatus(null);
      setNfcError(res.error || 'Error al grabar etiqueta NFC');
    }
  };

  // Acción #3: Verificar / Diagnosticar una etiqueta física NFC ya grabada
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
          ? 'Lector Web NFC no disponible en este navegador. En iPhone o Android puedes acercar el teléfono directamente a la etiqueta física desde la pantalla de bloqueo para abrir el enlace nativo.'
          : 'Web NFC reader not available in this browser. On iPhone or Android you can tap the physical tag directly from the home screen.'
      );
      return;
    }

    const ctrl = new AbortController();
    nfcAbortRef.current = ctrl;
    setIsTestingNfc(true);
    setNfcStatus(
      language === 'es'
        ? 'Modo Diagnóstico: acerca tu etiqueta NFC grabada para verificar su firma criptográfica...'
        : 'Diagnostic Mode: tap your programmed NFC tag to verify its cryptographic signature...'
    );

    await startPhysicalNfcScan({
      expectedPoiId: selectedPoi.id,
      signal: ctrl.signal,
      onValidRead: (verified) => {
        stopNfcHardware();
        tacticalAudio.playStampSuccess();
        setNfcStatus(
          language === 'es'
            ? `Etiqueta NFC verificada correctamente • UID: ${verified.serialNumber || 'NDEF'} • Código: ${verified.code}`
            : `NFC tag verified • UID: ${verified.serialNumber || 'NDEF'} • Code: ${verified.code}`
        );
      },
      onInvalidRead: (reason) => {
        setNfcError(
          language === 'es'
            ? `Etiqueta leída pero no coincide con este taller (${reason}).`
            : `Tag read but does not match this workshop (${reason}).`
        );
      },
      onHardwareError: (err) => {
        stopNfcHardware();
        setNfcError(err);
      }
    });
  };

  const handleCopy = async (type: 'code' | 'url' | 'ndef', value: string) => {
    tacticalAudio.playTacticalClick();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(type);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  // Métricas reales calculadas a partir del POI y la bitácora de sellos
  const stampsTodayCount = ledger.length;
  const unitTicketMxn = selectedPoi && selectedPoi.cost_mxn > 0 ? selectedPoi.cost_mxn : 85;
  const directSpendMxn = stampsTodayCount * unitTicketMxn;

  if (!selectedPoi || !profile) return null;

  return (
    <div className="space-y-4">
      {/* 1. BARRA RÁPIDA DE ESTADO EN VIVO DEL LOCAL (1 TOQUE) */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block">
              {language === 'es' ? 'Estado Operativo en el Mapa Peatonal (1 Clic)' : 'Live Status on Pedestrian Map (1 Click)'}
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              {profile.nombre_taller} • <span className="text-amber-400">{selectedPoi.zone.replace(/_/g, ' ')}</span>
            </h3>
          </div>

          {/* Botones de 1 toque para cambiar estado del taller */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleStatusChange('open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                liveStatus === 'open'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>{language === 'es' ? 'Abierto' : 'Open'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('live_demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                liveStatus === 'live_demo'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Demostración en Vivo' : 'Live Demo Active'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                liveStatus === 'closed'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Pausa / Cerrado' : 'Paused / Closed'}</span>
            </button>
          </div>
        </div>

        {/* Aviso rápido para visitantes */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/10">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Aviso hoy (ej. Horno abierto a las 12:00, taller de esmaltado)...'
                  : 'Live notice for walkers today...'
              }
              className="w-full bg-transparent text-xs text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveAnnouncement}
            className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            {savedNotice ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Actualizado' : 'Saved'}</span>
              </>
            ) : (
              <span>{language === 'es' ? 'Publicar Aviso' : 'Post Notice'}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. TERMINAL PRINCIPAL DE MOSTRADOR (POS DE SELLADO Y PROGRAMADOR NFC) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna Izquierda (7 cols): Mostrador de Sellado Rápido y Hardware NFC */}
        <div className="lg:col-span-7 bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <SmartphoneNfc className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  {language === 'es'
                    ? 'Estación de Sellado en Mostrador (NFC Real + Pulso + QR)'
                    : 'Counter Stamp Station (Real NFC + Live Pulse + QR)'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {language === 'es'
                    ? `Insignia oficial: "${profile.sello_artesanal}"`
                    : `Official badge: "${profile.sello_artesanal}"`}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${
                webNfcAvailable
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-sky-950/60 border-sky-500/40 text-sky-300'
              }`}
            >
              <Radio className="w-3 h-3" />
              {webNfcAvailable
                ? language === 'es'
                  ? 'Web NFC Hardware: Activo'
                  : 'Web NFC Hardware: Active'
                : language === 'es'
                ? 'Modo Pulso Local + URI NFC'
                : 'Live Pulse + NFC URI Mode'}
            </span>
          </div>

          {/* BOTÓN PRIMARIO GIGANTE: 1 Toque para Sellar a un Visitante en Mostrador */}
          <button
            type="button"
            onClick={handleIssueCounterStamp}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(245,158,11,0.35)] transition cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>
              {language === 'es'
                ? 'EMITIR SELLO AL VISITANTE EN MOSTRADOR (1 TOQUE)'
                : 'ISSUE STAMP TO VISITOR AT COUNTER (1 TAP)'}
            </span>
          </button>

          {stampedSuccess && (
            <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2 animate-fade-slide">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{stampedSuccess}</span>
            </div>
          )}

          {/* Tarjeta de QR + Código Verificador en Grande para el Visitante */}
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2.5 bg-white rounded-xl flex-shrink-0 shadow-md">
              <svg
                viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                className="w-28 h-28"
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
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                  <WifiOff className="w-3 h-3" />
                  {language === 'es' ? 'Verificación Offline FNV-1a' : 'Offline FNV-1a Token'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  SIG: {stampSignature}
                </span>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">
                  {language === 'es'
                    ? 'Código Verificador de Mostrador (para visitantes sin NFC):'
                    : 'Counter Verification Code (for non-NFC visitors):'}
                </div>
                <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-mono text-2xl font-black tracking-widest text-amber-400 bg-slate-900 px-3.5 py-1 rounded-xl border border-amber-500/40">
                    {stampCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('code', stampCode)}
                    className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'es' ? 'Copiado' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'es' ? 'Copiar' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                {language === 'es'
                  ? 'El visitante puede recibir el pulso automático en su pantalla, tocar tu etiqueta NFC física o escribir este código en su Pasaporte.'
                  : 'Visitors can receive the live pulse on their screen, tap your physical NFC tag, or enter this code in their Passport.'}
              </p>
            </div>
          </div>

          {/* Controles de Hardware NFC Físico (Grabar Etiqueta NTAG213/215 + Diagnóstico + Enlace NDEF URI) */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 space-y-3">
            <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>
                {language === 'es'
                  ? 'Programación de Etiqueta Física NFC del Taller (NTAG213 / NTAG215)'
                  : 'Physical Workshop NFC Sticker Programming (NTAG213 / NTAG215)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleWriteNfcTag}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  isWritingNfc
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/40 text-sky-300'
                }`}
              >
                {isWritingNfc ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cancelar Grabación NFC' : 'Cancel NFC Write'}</span>
                  </>
                ) : (
                  <>
                    <SmartphoneNfc className="w-4 h-4" />
                    <span>{language === 'es' ? 'Grabar Chip NFC Físico' : 'Write Physical NFC Tag'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleVerifyPhysicalTag}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  isTestingNfc
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-white/15 text-slate-200'
                }`}
              >
                {isTestingNfc ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>{language === 'es' ? 'Detener Diagnóstico' : 'Stop Diagnostic'}</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'es' ? 'Probar Etiqueta NFC Grabada' : 'Test Programmed NFC Tag'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Botones de copia de registros NDEF reales (URI para iOS/Android y Text Payload) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy('url', deepLinkUrl)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] text-slate-300 flex items-center justify-between gap-2 cursor-pointer"
                title={deepLinkUrl}
              >
                <span className="truncate font-mono text-[10px]">
                  {language === 'es' ? 'Enlace NDEF URI (iOS/Android):' : 'NDEF URI Link:'} /?nfc_stamp={selectedPoi.id}
                </span>
                {copiedField === 'url' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy('ndef', ndefTextPayload)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] text-slate-300 flex items-center justify-between gap-2 cursor-pointer"
                title={ndefTextPayload}
              >
                <span className="truncate font-mono text-[10px]">
                  {language === 'es' ? 'Payload NDEF Text:' : 'NDEF Text:'} {ndefTextPayload}
                </span>
                {copiedField === 'ndef' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
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
        </div>

        {/* Columna Derecha (5 cols): Bitácora en Vivo de Sellos y Métricas Operativas Reales */}
        <div className="lg:col-span-5 space-y-4">
          {/* KPIs Reales del Taller */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                {language === 'es' ? 'Actividad Real del Taller Hoy' : 'Live Workshop Activity Today'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                DENUE • {selectedPoi.entrance_accessible ? 'Acceso Plano' : 'Con Escalón'}
              </span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/10">
                <div className="text-[11px] text-slate-400">
                  {language === 'es' ? 'Sellos Verificados:' : 'Verified Stamps:'}
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                  {stampsTodayCount}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'es' ? 'Registrados en bitácora' : 'Logged in ledger'}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-white/10">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span>{language === 'es' ? 'Derrama Directa:' : 'Direct Spend:'}</span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  ${directSpendMxn} <span className="text-xs font-normal">MXN</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'es'
                    ? `Ticket prom. $${unitTicketMxn} MXN (${selectedPoi.visit_duration_min} min)`
                    : `Avg ticket $${unitTicketMxn} MXN (${selectedPoi.visit_duration_min}m)`}
                </div>
              </div>
            </div>

            {/* Bitácora en Vivo de Sellos Emitidos */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  {language === 'es' ? 'Últimos Sellos Otorgados' : 'Recent Issued Stamps'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {ledger.length} {language === 'es' ? 'registros' : 'records'}
                </span>
              </div>

              {ledger.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5 text-center text-xs text-slate-400">
                  {language === 'es'
                    ? 'Aún no has emitido sellos en esta sesión. Presiona el botón amarillo de mostrador para registrar el primer visitante.'
                    : 'No stamps issued yet in this session. Press the yellow counter button to log your first visitor.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {ledger.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-mono">{item.code}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono uppercase">
                            {item.method}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SIG: {item.signature}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ficha Compacta de Identidad Patrimonial del Taller */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-lg space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                {language === 'es' ? 'Expediente Patrimonial DENUE' : 'DENUE Heritage Dossier'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                {profile.oficio} ({profile.fundacion_anio})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>{language === 'es' ? 'Técnica:' : 'Technique:'}</strong> {profile.tecnica_ancestral}
            </p>
            <div className="text-[11px] text-amber-300 font-medium">
              <strong>{language === 'es' ? 'Horario demostración:' : 'Demo schedule:'}</strong>{' '}
              {profile.horario_demostracion}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

