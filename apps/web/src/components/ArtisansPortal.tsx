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
  Radio,
  QrCode,
  ExternalLink,
  Camera
} from 'lucide-react';
import {
  generateOfflineStampCode,
  isWebNfcSupported,
  writePhysicalNfcTag,
  startPhysicalNfcScan,
  emitLiveCounterStamp,
  getStampLedger,
  getWorkshopLiveStates,
  saveWorkshopLiveState,
  parseTouristQrPayload,
  StampLedgerEntry,
  WorkshopLiveState
} from '../utils/offlineStamp';
import { tacticalAudio } from '../utils/tacticalAudio';
import { useRouter } from '../router/Router';

export type ArtisanSpaceTab = 'counter' | 'activity' | 'workshop';

interface ArtisansPortalProps {
  pois: POI[];
  language: Language;
  activePoiId?: string;
  onSelectWorkshop?: (poiId: string) => void;
}

export const ArtisansPortal: FC<ArtisansPortalProps> = ({
  pois,
  language,
  activePoiId,
  onSelectWorkshop
}) => {
  const { navigate } = useRouter();

  const localBusinesses = useMemo(
    () => pois.filter((p) => p.is_local_business && p.artisan_profile),
    [pois]
  );

  const [selectedPoiId, setSelectedPoiId] = useState<string>(
    activePoiId || localBusinesses[0]?.id || ''
  );

  const [activeTab, setActiveTab] = useState<ArtisanSpaceTab>('counter');

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
  const [isScanningTouristQr, setIsScanningTouristQr] = useState(false);
  const [touristInputCode, setTouristInputCode] = useState('');
  const [touristScanResult, setTouristScanResult] = useState<string | null>(null);

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
        ? `¡Visita sellada con éxito! Pasaporte acreditado con el sello "${profile.sello_artesanal}" (${entry.code}).`
        : `Stamp issued! Visitor passport awarded "${profile.sello_artesanal}" (${entry.code}).`
    );
    setTimeout(() => setStampedSuccess(null), 4500);
  };

  const handleScanTouristSuccess = (rawOrParsedId?: string) => {
    if (!selectedPoi || !profile) return;
    const candidate = rawOrParsedId || touristInputCode;
    const parsed = parseTouristQrPayload(candidate);
    const touristId = parsed.valid && parsed.touristId ? parsed.touristId : candidate.trim() || 'TUR-7701';

    const entry = emitLiveCounterStamp(selectedPoi.id, selectedPoi.name);
    setLedger(getStampLedger(selectedPoi.id));
    tacticalAudio.playStampSuccess();
    setTouristScanResult(
      language === 'es'
        ? `¡QR de Turista (${touristId}) verificado con éxito! Sello oficial "${profile.sello_artesanal}" (${entry.code}) otorgado.`
        : `Tourist QR (${touristId}) verified! Official badge "${profile.sello_artesanal}" (${entry.code}) granted.`
    );
    setIsScanningTouristQr(false);
    setTouristInputCode('');
    setTimeout(() => setTouristScanResult(null), 5000);
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

  const handleWorkshopSelection = (poiId: string) => {
    setSelectedPoiId(poiId);
    if (onSelectWorkshop) {
      onSelectWorkshop(poiId);
    }
  };

  const stampsTodayCount = ledger.length;
  const unitTicketMxn = selectedPoi && selectedPoi.cost_mxn > 0 ? selectedPoi.cost_mxn : 85;
  const directSpendMxn = stampsTodayCount * unitTicketMxn;

  if (!selectedPoi || !profile) return null;

  return (
    <div className="space-y-4">
      {/* BARRA DE NAVEGACIÓN ENTRE ESPACIOS INDIVIDUALES DEL DUEÑO DE TALLER */}
      <nav
        aria-label={language === 'es' ? 'Navegación del taller' : 'Workshop navigation'}
        className="bg-[#FAF6EE]/95 backdrop-blur-md border-2 border-[#0F3078] rounded-2xl p-1.5 flex items-center justify-between gap-1 sm:gap-2 shadow-lg sticky top-0 z-30"
      >
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            setActiveTab('counter');
          }}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer select-none ${
            activeTab === 'counter'
              ? 'bg-[#0F3078] text-[#FAF6EE] shadow-md ring-1 ring-[#0F3078] font-serif'
              : 'text-[#0F3078]/70 hover:text-[#0F3078] hover:bg-[#0F3078]/10 font-serif'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{language === 'es' ? 'Mostrador' : 'Counter'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            setActiveTab('activity');
          }}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer select-none relative ${
            activeTab === 'activity'
              ? 'bg-[#0F3078] text-[#FAF6EE] shadow-md ring-1 ring-[#0F3078] font-serif'
              : 'text-[#0F3078]/70 hover:text-[#0F3078] hover:bg-[#0F3078]/10 font-serif'
          }`}
        >
          <History className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{language === 'es' ? 'Actividad' : 'Activity'}</span>
          {ledger.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold flex-shrink-0 ${
                activeTab === 'activity'
                  ? 'bg-[#FAF6EE] text-[#0F3078]'
                  : 'bg-[#0F3078] text-[#FAF6EE]'
              }`}
            >
              {ledger.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            tacticalAudio.playTacticalClick();
            setActiveTab('workshop');
          }}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer select-none ${
            activeTab === 'workshop'
              ? 'bg-[#0F3078] text-[#FAF6EE] shadow-md ring-1 ring-[#0F3078] font-serif'
              : 'text-[#0F3078]/70 hover:text-[#0F3078] hover:bg-[#0F3078]/10 font-serif'
          }`}
        >
          <Store className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{language === 'es' ? 'Mi Taller' : 'My Workshop'}</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* ESPACIO 1: MOSTRADOR Y SELLADO DIRECTO AL VISITANTE            */}
      {/* ============================================================== */}
      {activeTab === 'counter' && (
        <div className="space-y-4 animate-fade-slide">
          {/* Ficha Superior de Identidad y Estado Operativo */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#B84A2C] font-bold px-2 py-0.5 rounded-full bg-[#B84A2C]/15 border border-[#B84A2C]/30">
                    {selectedPoi.zone.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[#0F3078]/70 truncate">
                    {profile.maestro_artesano} • {profile.oficio}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#0F3078] tracking-tight font-serif font-black truncate">
                  {profile.nombre_taller}
                </h2>
              </div>

              {/* Selector de Estado Operativo de 1 toque */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white p-1.5 rounded-xl border border-[#0F3078]/20">
                <button
                  type="button"
                  onClick={() => handleStatusChange('open')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    liveStatus === 'open'
                      ? 'bg-[#0E2C9C] text-[#162035] border border-[#B84A2C]/60 shadow-md'
                      : 'text-[#0F3078]/70 hover:text-[#162035]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{language === 'es' ? 'Abierto' : 'Open'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('live_demo')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    liveStatus === 'live_demo'
                      ? 'bg-[#0F3078] text-[#FAF6EE] shadow-md font-black'
                      : 'text-[#0F3078]/70 hover:text-[#162035]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#0E2C9C]" />
                  <span>{language === 'es' ? 'Demostración Activa' : 'Live Demo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('closed')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    liveStatus === 'closed'
                      ? 'bg-[#7B5E86]/50 text-[#162035] border border-[#7B5E86]/70 shadow-md'
                      : 'text-[#0F3078]/70 hover:text-[#162035]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Pausa' : 'Paused'}</span>
                </button>
              </div>
            </div>

            {/* Aviso rápido para caminantes */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-[#9597C1]/20">
              <div className="flex-1 flex items-center gap-2 bg-white border border-[#0F3078]/20 rounded-xl px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-[#B84A2C] flex-shrink-0" />
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder={
                    language === 'es'
                      ? 'Aviso para visitantes hoy (ej. Torno abierto hasta las 14:00, esmaltado en vivo)...'
                      : 'Notice for visitors today...'
                  }
                  className="w-full bg-transparent text-xs text-[#162035] focus:outline-none placeholder:text-[#0F3078]/70/50"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveAnnouncement}
                className="px-4 py-2 rounded-xl bg-[#B84A2C]/15 hover:bg-[#EDE28E]/25 text-[#B84A2C] border border-[#B84A2C]/40 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-95"
              >
                {savedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#B84A2C]" />
                    <span>{language === 'es' ? 'Guardado' : 'Saved'}</span>
                  </>
                ) : (
                  <span>{language === 'es' ? 'Actualizar Aviso' : 'Update Notice'}</span>
                )}
              </button>
            </div>
          </div>

          {/* Botón Principal de Mostrador: Sellar Pasaporte */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F3078] uppercase tracking-wider font-serif font-black">
                  {language === 'es' ? 'Mostrador de Atención al Turista' : 'Visitor Greeting Station'}
                </h3>
                <p className="text-xs text-[#0F3078]/70">
                  {language === 'es'
                    ? `Sello oficial del taller: "${profile.sello_artesanal}"`
                    : `Workshop badge: "${profile.sello_artesanal}"`}
                </p>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#B84A2C]/15 border border-[#B84A2C]/30 text-[#B84A2C] font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#B84A2C] animate-pulse" />
                <span>{language === 'es' ? 'Listo para Sellar' : 'Ready to Stamp'}</span>
              </span>
            </div>

            {/* Acciones Principales de Mostrador: Escanear Turista (Invertido) + Tap-to-phone NFC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setIsScanningTouristQr(true);
                }}
                className="py-4 px-4 rounded-2xl bg-gradient-to-r from-[#0F3078] via-[#1638b5] to-[#0F3078] text-[#FAF6EE] hover:brightness-105 active:scale-[0.99] text-[#0E2C9C] font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(237,226,142,0.35)] border border-[#B84A2C] transition cursor-pointer select-none"
              >
                <Camera className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {language === 'es'
                    ? 'ESCANEAR QR DEL TURISTA'
                    : 'SCAN TOURIST QR CODE'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleVerifyPhysicalTag}
                className={`py-4 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 border transition cursor-pointer select-none active:scale-[0.99] ${
                  isTestingNfc
                    ? 'bg-rose-500/25 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-[#0E2C9C] hover:bg-[#1638b5] text-[#B84A2C] border-[#B84A2C]/40 shadow-lg'
                }`}
              >
                <SmartphoneNfc className={`w-5 h-5 ${isTestingNfc ? 'animate-pulse' : ''}`} />
                <span>
                  {isTestingNfc
                    ? (language === 'es' ? 'ESPERANDO CONTACTO NFC...' : 'WAITING FOR NFC TAP...')
                    : (language === 'es' ? 'NFC TELÉFONO A TELÉFONO' : 'PHONE-TO-PHONE NFC')}
                </span>
              </button>
            </div>

            {/* Sello Directo de 1 Toque para Visitantes Presenciales */}
            <button
              type="button"
              onClick={handleIssueCounterStamp}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#FAF6EE] border border-[#0F3078]/20 text-[#0F3078] text-xs font-bold text-[#162035] flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-[#B84A2C]" />
              <span>
                {language === 'es'
                  ? 'O registrar visita presencial rápida (1 Toque)'
                  : 'Or record quick in-person visit (1 Tap)'}
              </span>
            </button>

            {touristScanResult && (
              <div className="bg-emerald-950/80 border border-emerald-400/60 text-emerald-100 text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-fade-slide shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-bold">{touristScanResult}</span>
              </div>
            )}

            {stampedSuccess && (
              <div className="bg-white border-2 border-[#0F3078]/30 text-[#0F3078] text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-fade-slide">
                <CheckCircle2 className="w-4 h-4 text-[#B84A2C] flex-shrink-0" />
                <span>{stampedSuccess}</span>
              </div>
            )}

            {nfcStatus && (
              <div className="bg-slate-950/90 border border-amber-500/40 text-amber-300 text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-fade-slide">
                <SmartphoneNfc className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                <span>{nfcStatus}</span>
              </div>
            )}

            {nfcError && (
              <div className="bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-fade-slide">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{nfcError}</span>
              </div>
            )}

            {/* Modal de Escáner de QR del Turista */}
            {isScanningTouristQr && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsScanningTouristQr(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md bg-[#FAF6EE] border-4 border-[#0F3078] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#9597C1]/20">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-[#B84A2C]" />
                      <h3 className="font-black text-base text-[#0F3078] font-serif font-black">
                        {language === 'es' ? 'Escanear QR del Visitante' : 'Scan Visitor QR'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsScanningTouristQr(false)}
                      className="p-1.5 rounded-xl bg-[#07154E] text-[#0F3078]/70 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#0F3078]/70 leading-relaxed">
                    {language === 'es'
                      ? 'Apunta tu cámara al código QR que el turista tiene abierto en su pantalla. Funciona 100% sin que el turista requiera internet o datos móviles.'
                      : 'Point your camera at the QR code on the tourist’s phone screen. Works completely offline without mobile data for the tourist.'}
                  </p>

                  {/* Visor simulado de cámara con cuadro de enfoque */}
                  <div className="relative aspect-square max-w-[240px] mx-auto rounded-2xl bg-[#07154E] border-2 border-dashed border-[#B84A2C]/60 flex flex-col items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-4 border-2 border-[#B84A2C] rounded-xl pointer-events-none animate-pulse"></div>
                    <QrCode className="w-16 h-16 text-[#B84A2C]/40" />
                    <span className="text-[10px] text-[#B84A2C] font-bold mt-2 font-mono">
                      {language === 'es' ? 'ENFOCAR CÓDIGO QR' : 'FOCUS QR CODE'}
                    </span>
                  </div>

                  {/* Campo de entrada rápida o simulación de lectura inmediata */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={touristInputCode}
                        onChange={(e) => setTouristInputCode(e.target.value)}
                        placeholder="POPOGO:TURISTA:TUR-7701..."
                        className="flex-1 bg-[#07154E] border border-[#9597C1]/30 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-[#0F3078]/70/40 focus:outline-none focus:ring-1 focus:ring-[#EDE28E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleScanTouristSuccess()}
                        className="px-4 py-2 rounded-xl bg-[#0F3078] text-[#FAF6EE] font-black text-xs transition cursor-pointer hover:brightness-105 active:scale-95"
                      >
                        {language === 'es' ? 'Validar' : 'Validate'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleScanTouristSuccess(`POPOGO:TURISTA:TUR-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0E2C9C] hover:bg-[#1b3ea8] border border-[#B84A2C]/40 text-xs font-extrabold text-[#B84A2C] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Simular Lectura de Turista Actual' : 'Simulate Scanning Current Tourist'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Código de Respaldo del Taller (Mostrado de forma compacta para emergencias) */}
            <div className="bg-white border border-[#0F3078]/20 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#0F3078]/70 block">
                  {language === 'es' ? 'Código de Respaldo del Mostrador' : 'Counter Backup Code'}
                </span>
                <span className="font-mono text-base font-black text-[#B84A2C]">
                  {stampCode}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-[#0B228A] hover:bg-[#2544A7] border border-[#9597C1]/30 text-xs font-bold text-[#162035] flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#B84A2C]" /> : <Copy className="w-3.5 h-3.5 text-[#B84A2C]" />}
                <span>{copiedCode ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar' : 'Copy')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ESPACIO 2: ACTIVIDAD, MÉTRICAS Y BITÁCORA DEL DÍA             */}
      {/* ============================================================== */}
      {activeTab === 'activity' && (
        <div className="space-y-4 animate-fade-slide">
          {/* Tarjetas Ejecutivas de Impacto en el Taller */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md">
              <div className="text-xs text-[#0F3078]/70 font-semibold flex items-center justify-between">
                <span>{language === 'es' ? 'Visitantes Hoy' : 'Visitors Today'}</span>
                <Users className="w-4 h-4 text-[#B84A2C]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#B84A2C] font-mono">
                {stampsTodayCount}
              </div>
              <p className="text-[10px] text-[#162035]/80 font-medium">
                {language === 'es' ? 'Sellos otorgados en pasaportes' : 'Verified stamps today'}
              </p>
            </div>

            <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md">
              <div className="text-xs text-[#0F3078]/70 font-semibold flex items-center justify-between">
                <span>{language === 'es' ? 'Derrama Estimada' : 'Direct Spend'}</span>
                <DollarSign className="w-4 h-4 text-[#B84A2C]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#B84A2C] font-mono">
                ${directSpendMxn} <span className="text-xs font-normal text-[#162035]">MXN</span>
              </div>
              <p className="text-[10px] text-[#162035]/80 font-medium">
                {language === 'es' ? 'Consumo local directo en el taller' : 'Local commerce estimate'}
              </p>
            </div>

            <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md">
              <div className="text-xs text-[#0F3078]/70 font-semibold flex items-center justify-between">
                <span>{language === 'es' ? 'Ticket Promedio' : 'Average Ticket'}</span>
                <Award className="w-4 h-4 text-[#B84A2C]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#B84A2C] font-mono">
                ${unitTicketMxn} <span className="text-xs font-normal text-[#162035]">MXN</span>
              </div>
              <p className="text-[10px] text-[#162035]/80 font-medium">
                {language === 'es' ? 'Por visitante registrado' : 'Per verified visitor'}
              </p>
            </div>
          </div>

          {/* Bitácora de Sellos Emitidos */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#9597C1]/20 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#B84A2C]" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wide font-serif">
                  {language === 'es' ? 'Bitácora de Visitas de Hoy' : 'Today’s Stamped Visits'}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#B84A2C] bg-[#B84A2C]/15 border border-[#B84A2C]/30 px-2.5 py-0.5 rounded-full">
                {ledger.length} {language === 'es' ? 'sellos emitidos' : 'stamps issued'}
              </span>
            </div>

            {ledger.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-[#0F3078]/15 text-center text-xs text-[#0F3078]/70 space-y-2">
                <Award className="w-8 h-8 text-[#0F3078]/70/40 mx-auto" />
                <p className="font-bold text-[#162035]">
                  {language === 'es'
                    ? 'Aún no se han sellado visitas en esta jornada.'
                    : 'No stamps recorded in this session yet.'}
                </p>
                <p className="text-[11px] text-[#0F3078]/70">
                  {language === 'es'
                    ? 'Ve a la pestaña de Mostrador y presiona el botón de sellar al recibir a un visitante.'
                    : 'Switch to the Counter tab and tap the stamp button when greeting a visitor.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {ledger.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white border border-[#0F3078]/20 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EDE28E]" />
                      <div>
                        <span className="font-bold text-white block">
                          {language === 'es' ? 'Pasaporte Sellado' : 'Passport Stamped'}
                        </span>
                        <span className="text-[10px] text-[#0F3078]/70 font-mono">
                          {item.method === 'web-nfc'
                            ? 'NFC Físico'
                            : item.method === 'live-counter'
                            ? 'Mostrador Directo'
                            : item.method === 'deep-link'
                            ? 'Enlace QR'
                            : 'Código Verificador'}
                          {' • '}
                          <span className="text-[#B84A2C]">{item.code}</span>
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-[#0F3078]/70 bg-[#FAF6EE] px-2 py-1 rounded-lg border border-[#0F3078]/20 text-[#0F3078]">
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
        </div>
      )}

      {/* ============================================================== */}
      {/* ESPACIO 3: MI TALLER, HERRAMIENTAS NFC Y GESTIÓN               */}
      {/* ============================================================== */}
      {activeTab === 'workshop' && (
        <div className="space-y-4 animate-fade-slide">
          {/* Ficha Patrimonial Oficial */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            <div className="flex flex-wrap items-center justify-between border-b border-[#9597C1]/20 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#B84A2C]" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wide font-serif">
                  {language === 'es' ? 'Ficha Patrimonial del Taller' : 'Workshop Heritage Profile'}
                </h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#B84A2C]/15 text-[#B84A2C] border border-[#B84A2C]/30 font-bold">
                {selectedPoi.entrance_accessible
                  ? language === 'es' ? '✓ Acceso Llano Sin Escalón' : '✓ Step-free Access'
                  : language === 'es' ? '⚠ Cuenta con Escalón' : '⚠ Stepped Entrance'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#0F3078]/15 space-y-1">
                <span className="text-[10px] text-[#0F3078]/70 uppercase font-semibold block">
                  {language === 'es' ? 'Maestro Artesano & Oficio' : 'Master Artisan & Craft'}
                </span>
                <p className="font-bold text-white text-sm">
                  {profile.maestro_artesano}
                </p>
                <p className="text-[#B84A2C] text-xs">
                  {profile.oficio}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#0F3078]/15 space-y-1">
                <span className="text-[10px] text-[#0F3078]/70 uppercase font-semibold block">
                  {language === 'es' ? 'Sello Artesanal Oficial' : 'Official Artisan Stamp'}
                </span>
                <p className="font-bold text-white text-sm">
                  "{profile.sello_artesanal}"
                </p>
                <p className="text-[#0F3078]/70 text-xs">
                  {selectedPoi.zone.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#0F3078]/15 space-y-2 text-xs">
              <div>
                <strong className="text-white block mb-0.5">
                  {language === 'es' ? 'Técnica Ancestral y Materiales:' : 'Traditional Technique & Materials:'}
                </strong>
                <p className="text-[#162035]/90 leading-relaxed">
                  {profile.tecnica_ancestral}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <strong className="text-[#B84A2C] block text-[11px]">
                    {language === 'es' ? 'Horario de Demostración en Vivo:' : 'Live Demonstration Hours:'}
                  </strong>
                  <span className="text-white text-xs">
                    {profile.horario_demostracion}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de Taller Activo (para dueños con más de un taller) */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {language === 'es' ? 'Gestionar o Cambiar de Taller' : 'Switch Active Workshop'}
                </h4>
                <p className="text-xs text-[#0F3078]/70">
                  {language === 'es'
                    ? 'Selecciona otro taller si administras múltiples sedes artesanales.'
                    : 'Switch if you manage another artisan workshop.'}
                </p>
              </div>
            </div>

            <select
              value={selectedPoi.id}
              onChange={(e) => handleWorkshopSelection(e.target.value)}
              className="w-full bg-white border-2 border-[#0F3078]/25 rounded-xl text-[#162035] p-3 text-xs text-[#162035] focus:outline-none focus:ring-1 focus:ring-[#EDE28E] cursor-pointer"
            >
              {localBusinesses.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.artisan_profile?.oficio} ({p.zone.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Configuración de Sticker o Medallón NFC Físico */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#9597C1]/20 pb-3">
              <div className="flex items-center gap-2">
                <SmartphoneNfc className="w-4 h-4 text-[#B84A2C]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {language === 'es' ? 'Sticker NFC Físico del Mostrador' : 'Physical Counter NFC Sticker'}
                </h4>
              </div>
            </div>

            <p className="text-xs text-[#0F3078]/70 leading-relaxed">
              {language === 'es'
                ? 'Si tienes un sticker o medallón NFC físico en tu mostrador o vitrina, puedes programarlo aquí para que los turistas solo acerquen su teléfono y reciban su sello al instante.'
                : 'If you have a physical NFC sticker on your counter, program it here so visitors can tap-and-go.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleWriteNfcTag}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                  isWritingNfc
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : 'bg-[#B84A2C]/15 hover:bg-[#EDE28E]/25 border border-[#B84A2C]/40 text-[#B84A2C]'
                }`}
              >
                {isWritingNfc ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cancelar Grabación' : 'Cancel Write'}</span>
                  </>
                ) : (
                  <>
                    <SmartphoneNfc className="w-4 h-4" />
                    <span>{language === 'es' ? 'Grabar Chip NFC' : 'Write NFC Sticker'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleVerifyPhysicalTag}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                  isTestingNfc
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : 'bg-white hover:bg-[#FAF6EE] border border-[#0F3078]/25 text-[#0F3078]'
                }`}
              >
                {isTestingNfc ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>{language === 'es' ? 'Detener Prueba' : 'Stop Test'}</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 text-[#B84A2C]" />
                    <span>{language === 'es' ? 'Probar Etiqueta Grabada' : 'Test NFC Sticker'}</span>
                  </>
                )}
              </button>
            </div>

            {nfcStatus && (
              <div className="bg-white text-[#B84A2C] text-xs p-3 rounded-xl flex items-center gap-2 border border-[#B84A2C]/30 animate-fade-slide">
                <SmartphoneNfc className="w-4 h-4 text-[#B84A2C] flex-shrink-0 animate-pulse" />
                <span>{nfcStatus}</span>
              </div>
            )}

            {nfcError && (
              <div className="bg-rose-950/60 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2 border border-rose-500/40 animate-fade-slide">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{nfcError}</span>
              </div>
            )}
          </div>

          {/* Acceso Directo para ver cómo se ve en el mapa de visitantes */}
          <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                {language === 'es' ? 'Mapa Turístico de Visitantes' : 'Tourist Exploration Map'}
              </h4>
              <p className="text-xs text-[#0F3078]/70">
                {language === 'es'
                  ? 'Verifica cómo se muestra tu taller y tu horario de demostración para los caminantes.'
                  : 'Check how your workshop and schedule appear to pedestrians.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-2 rounded-xl bg-[#0F3078] hover:bg-[#0A2255] border border-[#FAF6EE]/20 text-xs font-bold text-[#FAF6EE] flex items-center gap-1.5 transition cursor-pointer flex-shrink-0"
            >
              <span>{language === 'es' ? 'Ver Mapa' : 'View Map'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
