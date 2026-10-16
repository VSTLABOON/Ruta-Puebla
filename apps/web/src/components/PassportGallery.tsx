import { useState, useRef, useEffect, useMemo, type FC } from 'react';
import { POI, Language, PassportState } from '@ruta-abierta/shared-types';
import { Award, Check, Lock, X, SmartphoneNfc, QrCode, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { HolographicBadge } from './HolographicBadge';
import {
  isWebNfcSupported,
  verifyOfflineStampPayload,
  startPhysicalNfcScan,
  subscribeToLiveCounterStamps,
  recordStampInLedger,
  getOrCreateTouristId,
  buildTouristQrPayload,
  buildOfflineQrMatrix
} from '../utils/offlineStamp';
import { tacticalAudio } from '../utils/tacticalAudio';

interface PassportGalleryProps {
  pois: POI[];
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
  language: Language;
}

const BARRIOS = [
  { id: 'all', name: { es: 'Todos los Barrios', en: 'All Neighborhoods' } },
  { id: 'analco', name: { es: 'Analco', en: 'Analco' } },
  { id: 'la_luz', name: { es: 'La Luz', en: 'La Luz' } },
  { id: 'el_parian', name: { es: 'El Parián', en: 'El Parián' } },
  { id: 'el_alto', name: { es: 'El Alto', en: 'El Alto' } },
  { id: 'xanenetla', name: { es: 'Xanenetla', en: 'Xanenetla' } }
];

export const PassportGallery: FC<PassportGalleryProps> = ({
  pois,
  passportState,
  onUnlockSecret,
  language
}) => {
  const [selectedBarrio, setSelectedBarrio] = useState('all');
  const [inspectingPoiId, setInspectingPoiId] = useState<string | null>(null);
  const [quickCode, setQuickCode] = useState('');
  const [globalNfcScanning, setGlobalNfcScanning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const touristId = useMemo(() => getOrCreateTouristId(), []);
  const touristQrPayload = useMemo(() => buildTouristQrPayload(touristId), [touristId]);
  const touristQrMatrix = useMemo(() => buildOfflineQrMatrix(touristQrPayload), [touristQrPayload]);
  const [showTouristQr, setShowTouristQr] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Filter POIs that have secrets or badges
  const badgePois = pois.filter((p) => p.secret_to_unlock || p.artisan_profile);
  const badgePoiIds = badgePois.map((p) => p.id);

  const stopGlobalScanner = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    setGlobalNfcScanning(false);
  };

  useEffect(() => {
    return () => stopGlobalScanner();
  }, []);

  const unlockByPoiId = (
    targetPoiId: string,
    method: 'web-nfc' | 'deep-link' | 'manual-code' | 'live-counter',
    serialNumber?: string
  ) => {
    const targetPoi = pois.find((p) => p.id === targetPoiId);
    if (!targetPoi) return;
    stopGlobalScanner();
    setScannerError(null);
    setScannerStatus(
      language === 'es'
        ? `¡Sello verificado en ${targetPoi.name}!`
        : `Verified stamp at ${targetPoi.name}!`
    );
    const badge = targetPoi.secret_to_unlock?.insignia_nombre || `Medallón ${targetPoi.name}`;
    recordStampInLedger({
      poiId: targetPoi.id,
      poiName: targetPoi.name,
      code: '',
      method,
      serialNumber
    });
    tacticalAudio.playStampSuccess();
    onUnlockSecret(targetPoi.id, badge);
    setInspectingPoiId(targetPoi.id);
    setQuickCode('');
  };

  const handleGlobalNfcScan = async () => {
    tacticalAudio.playTacticalClick();
    if (globalNfcScanning) {
      stopGlobalScanner();
      setScannerStatus(null);
      return;
    }

    setScannerError(null);
    setGlobalNfcScanning(true);

    unsubRef.current = subscribeToLiveCounterStamps(undefined, (verified) => {
      if (verified.poiId) {
        unlockByPoiId(verified.poiId, 'live-counter', verified.serialNumber);
      }
    });

    if (isWebNfcSupported()) {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setScannerStatus(
        language === 'es'
          ? 'Lector NFC universal activo: acerca tu teléfono a cualquier etiqueta NTAG de taller...'
          : 'Universal NFC reader active: hold your phone near any workshop NTAG...'
      );
      await startPhysicalNfcScan({
        allPoiIds: badgePoiIds,
        signal: ctrl.signal,
        onValidRead: (res) => {
          if (res.poiId) {
            unlockByPoiId(res.poiId, 'web-nfc', res.serialNumber);
          }
        },
        onInvalidRead: () => {
          setScannerError(
            language === 'es'
              ? 'Etiqueta NFC detectada pero sin firma válida de PopoGo.'
              : 'NFC tag detected without a valid PopoGo signature.'
          );
        }
      });
    } else {
      setScannerStatus(
        language === 'es'
          ? 'Escuchando pulso en vivo de cualquier taller... (O ingresa el código del mostrador a la derecha).'
          : 'Listening for live counter pulse from any workshop... (Or enter the counter code).'
      );
    }
  };

  const handleQuickCodeVerify = () => {
    setScannerError(null);
    const verified = verifyOfflineStampPayload(quickCode, undefined, badgePoiIds);
    if (verified.valid && verified.poiId) {
      unlockByPoiId(verified.poiId, verified.source, verified.serialNumber);
    } else {
      tacticalAudio.playTacticalClick();
      setScannerError(
        language === 'es'
          ? 'Código no reconocido. Verifica el código de 3 letras y 4 números en el mostrador del taller.'
          : 'Unrecognized code. Check the 3-letter, 4-digit code at the workshop counter.'
      );
    }
  };

  const filteredPois = selectedBarrio === 'all'
    ? badgePois
    : badgePois.filter((p) => p.zone.toLowerCase().includes(selectedBarrio));

  const totalBadges = badgePois.length;
  const unlockedCount = passportState.unlocked_secrets.length;
  const progressPct = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

  const inspectingPoi = pois.find((p) => p.id === inspectingPoiId);

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Tarjeta de Código QR Offline del Turista (Sellado Invertido) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                  {language === 'es' ? '100% Sin Conexión' : '100% Offline'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {touristId}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-serif tracking-tight mt-0.5">
                {language === 'es' ? 'Tu Código QR de Visitante' : 'Your Visitor QR Code'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTouristQr((v) => !v)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={showTouristQr ? (language === 'es' ? 'Ocultar QR' : 'Hide QR') : (language === 'es' ? 'Mostrar QR' : 'Show QR')}
          >
            {showTouristQr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showTouristQr && (
          <div className="flex flex-col sm:flex-row items-center gap-5 pt-2 animate-in fade-in duration-200">
            {/* Código QR Generado Offline */}
            <div className="p-3 bg-white rounded-2xl flex-shrink-0 shadow-[0_0_25px_rgba(251,191,36,0.25)] border-2 border-amber-400/80">
              <svg
                viewBox={`0 0 ${touristQrMatrix.length} ${touristQrMatrix.length}`}
                className="w-32 h-32 sm:w-36 sm:h-36"
                shapeRendering="crispEdges"
                aria-label={`QR ${touristId}`}
              >
                {touristQrMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) =>
                    cell ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width={1}
                        height={1}
                        fill="#020617"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <div className="space-y-2.5 text-center sm:text-left flex-1">
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {language === 'es'
                  ? 'Muestra este código al maestro artesano en su mostrador. Él lo escaneará con su teléfono para otorgarte el sello oficial sin que tú gastes tus datos móviles.'
                  : 'Show this code to the artisan at the counter. They will scan it with their device to grant you the official badge without using your mobile roaming data.'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="text-[11px] font-mono bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{unlockedCount} / {totalBadges} {language === 'es' ? 'sellos acumulados' : 'stamps earned'}</span>
                </div>

                <div className="text-[11px] font-mono bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl text-sky-300 flex items-center gap-1.5">
                  <SmartphoneNfc className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'es' ? 'NFC Tap-to-phone habilitado' : 'Tap-to-phone NFC ready'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header Telemetry Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">
                {language === 'es' ? 'Pasaporte de Exploración Peatonal' : 'Pedestrian Exploration Passport'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'es' ? 'Insignias y sellos oficiales de talleres y patrimonio' : 'Official workshop & heritage stamps'}
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-sm font-black text-amber-400">{unlockedCount}</span>
            <span className="text-xs text-slate-500"> / {totalBadges}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-400">
            <span>{language === 'es' ? 'Progreso de Colección' : 'Collection Progress'}</span>
            <span className="text-amber-400 font-bold">
              {unlockedCount} / {totalBadges} {language === 'es' ? 'sellos' : 'stamps'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Barra Rápida Universal: Escáner NFC Directo + Validador de Código de Mostrador */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleGlobalNfcScan}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              globalNfcScanning
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
            }`}
          >
            <SmartphoneNfc className={`w-4 h-4 ${globalNfcScanning ? 'animate-ping' : ''}`} />
            <span>
              {globalNfcScanning
                ? language === 'es'
                  ? 'Detener Lector NFC'
                  : 'Stop NFC Reader'
                : language === 'es'
                ? 'Escanear Etiqueta NFC / Recibir Pulso'
                : 'Scan NFC Tag / Receive Pulse'}
            </span>
          </button>

          <div className="flex-1 flex items-center gap-1.5">
            <input
              type="text"
              value={quickCode}
              onChange={(e) => {
                setQuickCode(e.target.value);
                setScannerError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickCodeVerify();
                }
              }}
              placeholder={
                language === 'es'
                  ? 'Código de taller (ej. HOR-1234)...'
                  : 'Workshop code (e.g. HOR-1234)...'
              }
              className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white uppercase placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={handleQuickCodeVerify}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Canjear' : 'Redeem'}</span>
            </button>
          </div>
        </div>

        {scannerStatus && (
          <div className="text-[11px] text-amber-300 bg-slate-950/90 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
            <SmartphoneNfc className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>{scannerStatus}</span>
          </div>
        )}

        {scannerError && (
          <div className="text-[11px] text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{scannerError}</span>
          </div>
        )}

        {/* Barrio Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {BARRIOS.map((barrio) => (
            <button
              key={barrio.id}
              onClick={() => setSelectedBarrio(barrio.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedBarrio === barrio.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {barrio.name[language]}
            </button>
          ))}
        </div>
      </div>

      {/* Inspect Modal if a badge is tapped */}
      {inspectingPoi && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                {language === 'es' ? 'Ficha Holográfica' : 'Holographic Card'}
              </span>
              <button
                onClick={() => setInspectingPoiId(null)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1.5 bg-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <HolographicBadge
              poiId={inspectingPoi.id}
              badgeName={inspectingPoi.secret_to_unlock?.insignia_nombre || `Medallón ${inspectingPoi.name}`}
              poiName={inspectingPoi.name}
              zone={inspectingPoi.zone}
              secretTitle={inspectingPoi.secret_to_unlock?.titulo}
              secretDescription={inspectingPoi.secret_to_unlock?.descripcion}
              isUnlocked={passportState.unlocked_secrets.includes(inspectingPoi.id)}
              onUnlock={() => {
                const badge = inspectingPoi.secret_to_unlock?.insignia_nombre || `Medallón ${inspectingPoi.name}`;
                onUnlockSecret(inspectingPoi.id, badge);
              }}
              language={language}
            />
          </div>
        </div>
      )}

      {/* Badges Grid Responsivo */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredPois.map((p) => {
          const isUnlocked = passportState.unlocked_secrets.includes(p.id);
          const badgeName = p.secret_to_unlock?.insignia_nombre || `Sello ${p.name}`;

          return (
            <div
              key={p.id}
              onClick={() => setInspectingPoiId(p.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-slate-900/90 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400'
                  : 'bg-slate-950/80 border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              {/* Top row */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                <span className="uppercase truncate max-w-[80px]">{p.zone.replace(/_/g, ' ')}</span>
                {isUnlocked ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Medallion Preview */}
              <div className="my-2 flex flex-col items-center text-center">
                <div
                  className={`w-12 h-12 rounded-full border flex items-center justify-center mb-1.5 transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
                >
                  <Award className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1">
                  {badgeName}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {p.name}
                </p>
              </div>

              {/* Status footer */}
              <div className="pt-2 border-t border-white/5 text-center">
                <span
                  className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                    isUnlocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {isUnlocked
                    ? (language === 'es' ? 'Coleccionada' : 'Collected')
                    : (language === 'es' ? 'Por descubrir' : 'Locked')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
