import { useState, useRef, useMemo, useEffect, type MouseEvent, type TouchEvent, type FC } from 'react';
import {
  Sparkles,
  Check,
  ShieldCheck,
  Flame,
  SmartphoneNfc,
  QrCode,
  WifiOff,
  AlertCircle,
  Radio,
  X
} from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';
import {
  generateOfflineStampCode,
  isWebNfcSupported,
  verifyOfflineStampPayload,
  startPhysicalNfcScan,
  subscribeToLiveCounterStamps,
  recordStampInLedger
} from '../utils/offlineStamp';
import { TalaveraPlateMedallion } from './TalaveraOrnament';

interface HolographicBadgeProps {
  poiId?: string;
  badgeName: string;
  poiName: string;
  zone: string;
  secretTitle?: string;
  secretDescription?: string;
  isUnlocked: boolean;
  onUnlock?: () => void;
  language?: 'es' | 'en';
}

export const HolographicBadge: FC<HolographicBadgeProps> = ({
  poiId = 'poi_catedral',
  badgeName,
  poiName,
  zone,
  secretTitle,
  secretDescription,
  isUnlocked,
  onUnlock,
  language = 'es'
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const unsubscribeLiveRef = useRef<(() => void) | null>(null);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [stampMode, setStampMode] = useState<'nfc' | 'qr'>('nfc');
  const [nfcScanning, setNfcScanning] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const expectedCode = useMemo(() => generateOfflineStampCode(poiId), [poiId]);
  const webNfcAvailable = useMemo(() => isWebNfcSupported(), []);

  const stopNfcListeners = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (unsubscribeLiveRef.current) {
      unsubscribeLiveRef.current();
      unsubscribeLiveRef.current = null;
    }
    setNfcScanning(false);
  };

  useEffect(() => {
    return () => {
      stopNfcListeners();
    };
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = Math.max(-15, Math.min(15, ((y - centerY) / centerY) * -12));
    const rotY = Math.max(-15, Math.min(15, ((x - centerX) / centerX) * 12));

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handleReset = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  const handleStamp = (
    method: 'web-nfc' | 'deep-link' | 'manual-code' | 'live-counter',
    serialNumber?: string
  ) => {
    stopNfcListeners();
    setErrorMsg(null);
    setFeedbackMsg(null);
    if (!isUnlocked && onUnlock) {
      recordStampInLedger({
        poiId,
        poiName,
        code: expectedCode,
        method,
        serialNumber
      });
      tacticalAudio.playStampSuccess();
      onUnlock();
    }
  };

  const handleNfcTap = async () => {
    if (isUnlocked) return;
    tacticalAudio.playTacticalClick();

    if (nfcScanning) {
      stopNfcListeners();
      setFeedbackMsg(null);
      return;
    }

    setErrorMsg(null);
    setNfcScanning(true);

    // 1. Escuchar pulsos en vivo desde la terminal del artesano (BroadcastChannel / Storage)
    unsubscribeLiveRef.current = subscribeToLiveCounterStamps(poiId, (verified) => {
      handleStamp('live-counter', verified.serialNumber);
    });

    // 2. Si el dispositivo soporta Web NFC (Chrome Android), activar el lector NDEF real
    if (webNfcAvailable) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setFeedbackMsg(
        language === 'es'
          ? 'Lector Web NFC activo: acerca tu teléfono a la etiqueta física NTAG del taller o espera el pulso del mostrador...'
          : 'Web NFC reader active: hold your phone near the physical workshop NTAG or wait for counter pulse...'
      );

      await startPhysicalNfcScan({
        expectedPoiId: poiId,
        signal: controller.signal,
        onValidRead: (res) => {
          handleStamp('web-nfc', res.serialNumber);
        },
        onInvalidRead: (reason) => {
          setErrorMsg(
            language === 'es'
              ? reason === 'wrong_poi'
                ? 'Esta etiqueta NFC corresponde a otro taller de la ruta.'
                : 'Etiqueta NFC leída, pero no contiene una firma válida de este taller.'
              : 'NFC tag read, but signature does not match this workshop.'
          );
        },
        onHardwareError: (hwErr) => {
          setFeedbackMsg(
            language === 'es'
              ? `Escuchando pulso desde el mostrador del taller (${hwErr})`
              : `Listening for live counter pulse (${hwErr})`
          );
        }
      });
    } else {
      setFeedbackMsg(
        language === 'es'
          ? 'Escuchando pulso en vivo del mostrador del taller... (En iPhone/iOS o PC sin Web NFC, acerca el teléfono a la etiqueta física para abrir su enlace nativo o pide al artesano emitir el sello en su pantalla).'
          : 'Listening for live workshop counter pulse... (On iOS/Desktop without Web NFC, tap the physical tag via OS URL reader or ask the artisan to emit a stamp).'
      );
    }
  };

  const handleVerifyOfflineCode = () => {
    setErrorMsg(null);
    const verification = verifyOfflineStampPayload(inputCode, poiId);
    if (verification.valid) {
      handleStamp(verification.source, verification.serialNumber);
    } else {
      tacticalAudio.playTacticalClick();
      if (verification.errorReason === 'empty_input') {
        setErrorMsg(
          language === 'es'
            ? 'Ingresa el código verificador del taller o pega el payload NDEF.'
            : 'Enter the workshop verification code or paste the NDEF payload.'
        );
      } else if (verification.errorReason === 'wrong_poi') {
        setErrorMsg(
          language === 'es'
            ? 'El código o enlace ingresado pertenece a otro punto de interés.'
            : 'The entered code belongs to a different point of interest.'
        );
      } else {
        setErrorMsg(
          language === 'es'
            ? 'Código incorrecto. Solicita el código verificador en el mostrador del taller.'
            : 'Invalid code. Ask for the verification code at the workshop counter.'
        );
      }
    }
  };

  return (
    <div
      className="perspective-1000 py-2 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleReset}
      onTouchStart={() => setIsHovered(true)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleReset}
    >
      <div
        ref={cardRef}
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out'
        }}
        className={`relative overflow-hidden rounded-3xl p-5 border-2 transition-all duration-300 ${
          isUnlocked
            ? 'bg-[#FAF6EE] border-[#0F3078] shadow-[0_12px_36px_rgba(15,48,120,0.25)]'
            : 'bg-[#FAF6EE]/90 border-[#0F3078]/30 shadow-lg'
        }`}
      >
        {/* Cerámica vitrificada reflejo de brillo */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.7) 0%, rgba(240,180,58,0.2) 35%, rgba(15,48,120,0.1) 60%, transparent 80%)`
          }}
        />

        {/* Textura sutil de petatillo de Talavera */}
        <div className="absolute inset-0 bg-[radial-gradient(#0F3078_0.75px,transparent_0.75px)] [background-size:14px_14px] opacity-10 pointer-events-none" />

        {/* Cabecera del Medallón */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b-2 border-[#0F3078]/15 text-xs">
          <div className="flex items-center gap-1.5 font-serif uppercase tracking-wider text-[11px] text-[#0F3078] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#B84A2C]" />
            <span>{language === 'es' ? 'Placa de Talavera Poblana' : 'Puebla Talavera Plate'}</span>
          </div>
          <span className="font-serif text-[10px] text-[#0F3078] uppercase px-2.5 py-0.5 rounded-full bg-white/80 border border-[#0F3078]/25 font-bold">
            {zone.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Medallón Central de Cerámica Talavera */}
        <div className="relative z-10 my-4 flex flex-col items-center text-center">
          <div className="relative mb-3 flex items-center justify-center">
            {/* Medallón auténtico Talavera */}
            <TalaveraPlateMedallion size="lg" variant={isUnlocked ? 'polychrome' : 'cobalt'} animate={isUnlocked} />

            {/* Sello de verificación */}
            <div
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
                isUnlocked ? 'bg-[#1D6B52] text-[#FAF6EE]' : 'bg-[#B84A2C] text-[#FAF6EE]'
              }`}
            >
              {isUnlocked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            </div>
          </div>

          <h4 className="text-base font-serif font-black tracking-tight text-[#0F3078] mb-0.5">
            {badgeName}
          </h4>
          <p className="text-xs text-[#B84A2C] font-serif font-semibold">
            {poiName}
          </p>
        </div>

        {/* Información secreta del artesano o patrimonio */}
        {secretTitle && (
          <div className="relative z-10 bg-white/90 rounded-2xl p-3 border-2 border-[#0F3078]/15 text-xs space-y-1 my-3 text-left shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#B84A2C] text-[11px] font-serif">
              <Flame className="w-3.5 h-3.5 text-[#B84A2C]" />
              <span>{secretTitle}</span>
            </div>
            {secretDescription && (
              <p className="text-[11px] text-[#162035]/80 leading-relaxed font-sans">
                {secretDescription}
              </p>
            )}
          </div>
        )}

        {/* Controles de sellado físico / NFC / Código de mostrador */}
        <div className="relative z-10 pt-3 border-t-2 border-[#0F3078]/15 space-y-2.5">
          {isUnlocked ? (
            <div className="w-full py-2 px-3 rounded-xl bg-[#1D6B52]/15 border border-[#1D6B52]/40 text-[#1D6B52] text-xs font-bold flex items-center justify-center gap-2 font-serif">
              <Check className="w-4 h-4 text-[#1D6B52] stroke-[2.5]" />
              <span>
                {language === 'es'
                  ? `Sello Horneado en Pasaporte (${expectedCode})`
                  : `Baked Stamp in Passport (${expectedCode})`}
              </span>
            </div>
          ) : (
            <>
              {/* Selector de método de sellado */}
              <div className="grid grid-cols-2 gap-1.5 bg-white/70 p-1 rounded-xl border border-[#0F3078]/15 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setStampMode('nfc');
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    stampMode === 'nfc'
                      ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm font-serif'
                      : 'text-[#0F3078]/70 hover:text-[#0F3078]'
                  }`}
                >
                  <SmartphoneNfc className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Lector NFC / Mostrador' : 'NFC / Counter Scan'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    stopNfcListeners();
                    setStampMode('qr');
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    stampMode === 'qr'
                      ? 'bg-[#B84A2C] text-[#FAF6EE] shadow-sm font-serif'
                      : 'text-[#0F3078]/70 hover:text-[#0F3078]'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Código de Taller' : 'Workshop Code'}</span>
                </button>
              </div>

              {stampMode === 'nfc' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono px-1 text-[#0F3078]/70">
                    <span className="flex items-center gap-1">
                      <Radio className={`w-3 h-3 ${webNfcAvailable ? 'text-[#1D6B52]' : 'text-[#0F3078]'}`} />
                      {webNfcAvailable
                        ? language === 'es'
                          ? 'Hardware Web NFC: Activo'
                          : 'Web NFC Hardware: Ready'
                        : language === 'es'
                        ? 'Modo Enlace NFC Nativo + Receptor en Vivo'
                        : 'Native NFC Link + Live Receiver'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNfcTap}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer font-serif ${
                      nfcScanning
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-700 hover:bg-rose-500/30'
                        : 'bg-[#0F3078] hover:bg-[#0A2255] active:scale-[0.98] text-[#FAF6EE] shadow-md border border-[#FAF6EE]/20'
                    }`}
                  >
                    {nfcScanning ? (
                      <>
                        <X className="w-4 h-4 text-rose-600" />
                        <span>
                          {language === 'es'
                            ? 'Detener Escáner NFC / Receptor'
                            : 'Stop NFC Scanner / Receiver'}
                        </span>
                      </>
                    ) : (
                      <>
                        <SmartphoneNfc className="w-4 h-4" />
                        <span>
                          {language === 'es'
                            ? 'Activar Escáner NFC / Recibir Sello'
                            : 'Start NFC Scan / Receive Stamp'}
                        </span>
                      </>
                    )}
                  </button>

                  {feedbackMsg && (
                    <div className="bg-white/90 border border-[#0F3078]/20 rounded-xl p-2.5 text-[11px] text-[#0F3078] leading-relaxed flex items-start gap-2 text-left shadow-xs">
                      <SmartphoneNfc className="w-4 h-4 text-[#0F3078] flex-shrink-0 mt-0.5 animate-pulse" />
                      <span>{feedbackMsg}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="bg-rose-100 border border-rose-300 rounded-xl p-2 text-[11px] text-rose-800 flex items-center gap-1.5 text-left">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/90 border border-[#0F3078]/20 rounded-xl p-3 space-y-2.5 text-left shadow-xs">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D6B52] uppercase font-serif">
                      <WifiOff className="w-3 h-3" />
                      <span>
                        {language === 'es'
                          ? 'Verificación Criptográfica Offline (FNV-1a)'
                          : 'Offline Cryptographic Verification (FNV-1a)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#162035]/80 leading-snug">
                      {language === 'es'
                        ? 'Ingresa el código verificador que aparece en la pantalla del taller (ej. ABC-1234) o pega el payload de la etiqueta NFC:'
                        : 'Enter the verification code shown on the workshop screen (e.g., ABC-1234) or paste the NFC tag payload:'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => {
                        setInputCode(e.target.value);
                        setErrorMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyOfflineCode();
                        }
                      }}
                      placeholder="Ej. ABC-1234"
                      className="flex-1 bg-white border border-[#0F3078]/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#162035] uppercase placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F3078]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOfflineCode}
                      className="px-3 py-1.5 rounded-lg bg-[#B84A2C] hover:bg-[#96381F] text-[#FAF6EE] font-bold text-xs transition cursor-pointer flex items-center gap-1 font-serif shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Validar' : 'Verify'}</span>
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="bg-rose-100 border border-rose-300 rounded-lg p-2 text-[11px] text-rose-800 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
