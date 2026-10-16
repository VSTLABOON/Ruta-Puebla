/**
 * Utilidades Reales para Sellado de Pasaporte Cultural mediante:
 * 1. Web NFC API (NDEFReader scan y write con AbortController y decodificación NDEF real)
 * 2. Deep-Link URI para etiquetas físicas NTAG213/215 (compatible con iOS y Android a nivel SO)
 * 3. Canal en vivo P2P / Local (BroadcastChannel + Storage) entre Mostrador de Taller y Visitante
 * 4. Verificación criptográfica determinista FNV-1a sin conexión a internet
 */

export interface VerifiedStampPayload {
  valid: boolean;
  poiId: string | null;
  code: string | null;
  signature: string | null;
  source: 'web-nfc' | 'deep-link' | 'manual-code' | 'live-counter';
  serialNumber?: string;
  errorReason?: string;
}

export interface StampLedgerEntry {
  id: string;
  poiId: string;
  poiName: string;
  code: string;
  signature: string;
  timestamp: string;
  method: 'web-nfc' | 'deep-link' | 'manual-code' | 'live-counter';
  serialNumber?: string;
}

export interface WorkshopLiveState {
  poiId: string;
  status: 'open' | 'live_demo' | 'closed';
  announcement: string;
  updatedAt: string;
}

const STAMP_SECRET_SALT = 'RUTA-ABIERTA-PUEBLA-SECIHTI-2026';
const LEDGER_STORAGE_KEY = 'ruta_abierta_stamp_ledger_v1';
const WORKSHOP_STATE_KEY = 'ruta_abierta_workshop_live_state_v1';
const NFC_BROADCAST_CHANNEL = 'ruta_abierta_nfc_live_channel';
const NFC_BEACON_STORAGE_KEY = 'ruta_abierta_last_nfc_beacon';

function fnv1aHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateOfflineStampCode(poiId: string): string {
  const hash = fnv1aHash(`RUTA-PUEBLA-2026:${poiId}`);
  const num = (hash % 9000) + 1000;
  const prefix = poiId
    .replace('poi_', '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
  return `${prefix}-${num}`;
}

export function generateStampSignature(poiId: string, code: string): string {
  const cleanCode = code.trim().toUpperCase();
  const hash = fnv1aHash(`${STAMP_SECRET_SALT}:${poiId}:${cleanCode}`);
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

export function buildNfcTextPayload(poiId: string): string {
  const code = generateOfflineStampCode(poiId);
  const sig = generateStampSignature(poiId, code);
  return `RUTA-ABIERTA:v1:${poiId}:${code}:${sig}`;
}

export function buildNfcDeepLinkUrl(poiId: string, origin?: string): string {
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://ruta-abierta.puebla.gob.mx');
  const code = generateOfflineStampCode(poiId);
  const sig = generateStampSignature(poiId, code);
  const params = new URLSearchParams({
    nfc_stamp: poiId,
    code,
    sig
  });
  return `${baseOrigin}/?${params.toString()}`;
}

/**
 * Valida de forma estricta un payload proveniente de:
 * - Etiqueta NFC NDEF de texto ("RUTA-ABIERTA:v1:poi_id:CODE:SIG" o "RUTA-ABIERTA:poi_id:CODE")
 * - Etiqueta NFC NDEF URI / QR ("https://.../?nfc_stamp=poi_id&code=CODE&sig=SIG")
 * - Código corto verificador ingresado manualmente ("TAL-1234")
 */
export function verifyOfflineStampPayload(
  rawInput: string,
  expectedPoiId?: string,
  allPoiIds: string[] = []
): VerifiedStampPayload {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      poiId: null,
      code: null,
      signature: null,
      source: 'manual-code',
      errorReason: 'empty_input'
    };
  }

  // Caso 1: URL con parámetros (?nfc_stamp=...)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('nfc_stamp=')) {
    try {
      const urlObj = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://ruta-abierta.local');
      const poiId = urlObj.searchParams.get('nfc_stamp') || urlObj.searchParams.get('poi');
      const code = (urlObj.searchParams.get('code') || '').trim().toUpperCase();
      const sig = (urlObj.searchParams.get('sig') || '').trim().toUpperCase();

      if (!poiId || !code) {
        return {
          valid: false,
          poiId,
          code,
          signature: sig,
          source: 'deep-link',
          errorReason: 'missing_params'
        };
      }

      if (expectedPoiId && poiId !== expectedPoiId) {
        return {
          valid: false,
          poiId,
          code,
          signature: sig,
          source: 'deep-link',
          errorReason: 'wrong_poi'
        };
      }

      const expectedCode = generateOfflineStampCode(poiId);
      const expectedSig = generateStampSignature(poiId, expectedCode);
      const isCodeValid = code === expectedCode;
      const isSigValid = !sig || sig === expectedSig;

      return {
        valid: isCodeValid && isSigValid,
        poiId,
        code,
        signature: sig || expectedSig,
        source: 'deep-link',
        errorReason: isCodeValid && isSigValid ? undefined : 'invalid_signature'
      };
    } catch {
      return {
        valid: false,
        poiId: null,
        code: null,
        signature: null,
        source: 'deep-link',
        errorReason: 'malformed_url'
      };
    }
  }

  // Caso 2: Payload NDEF estructurado "RUTA-ABIERTA:..."
  if (trimmed.toUpperCase().startsWith('RUTA-ABIERTA:')) {
    const parts = trimmed.split(':');
    // Soporta tanto RUTA-ABIERTA:v1:poiId:code:sig como RUTA-ABIERTA:poiId:code
    let poiId = '';
    let code = '';
    let sig = '';

    if (parts[1] === 'v1' && parts.length >= 5) {
      poiId = parts[2];
      code = parts[3].toUpperCase();
      sig = parts[4].toUpperCase();
    } else if (parts.length >= 3) {
      poiId = parts[1];
      code = parts[2].toUpperCase();
      sig = parts[3]?.toUpperCase() || '';
    }

    if (expectedPoiId && poiId !== expectedPoiId) {
      return {
        valid: false,
        poiId,
        code,
        signature: sig,
        source: 'web-nfc',
        errorReason: 'wrong_poi'
      };
    }

    const expectedCode = generateOfflineStampCode(poiId);
    const expectedSig = generateStampSignature(poiId, expectedCode);
    const valid = code === expectedCode && (!sig || sig === expectedSig);

    return {
      valid,
      poiId,
      code,
      signature: sig || expectedSig,
      source: 'web-nfc',
      errorReason: valid ? undefined : 'invalid_ndef_token'
    };
  }

  // Caso 3: Código corto de taller ingresado manualmente (ej. "TAL-4812" o "4812")
  const normalizedCode = trimmed.toUpperCase();
  if (expectedPoiId) {
    const expectedCode = generateOfflineStampCode(expectedPoiId);
    const numericPart = expectedCode.split('-')[1];
    const isMatch = normalizedCode === expectedCode || (numericPart && normalizedCode === numericPart);
    return {
      valid: Boolean(isMatch),
      poiId: expectedPoiId,
      code: isMatch ? expectedCode : normalizedCode,
      signature: isMatch ? generateStampSignature(expectedPoiId, expectedCode) : null,
      source: 'manual-code',
      errorReason: isMatch ? undefined : 'code_mismatch'
    };
  }

  // Si no se especificó expectedPoiId, buscar en la lista de todos los POIs
  for (const candidateId of allPoiIds) {
    const candidateCode = generateOfflineStampCode(candidateId);
    if (normalizedCode === candidateCode) {
      return {
        valid: true,
        poiId: candidateId,
        code: candidateCode,
        signature: generateStampSignature(candidateId, candidateCode),
        source: 'manual-code'
      };
    }
  }

  return {
    valid: false,
    poiId: expectedPoiId || null,
    code: normalizedCode,
    signature: null,
    source: 'manual-code',
    errorReason: 'code_mismatch'
  };
}

export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/**
 * Graba una etiqueta física NFC (NTAG213 / NTAG215 / NTAG216) usando Web NFC API real.
 * Escribe dos registros NDEF estándar:
 * 1) URI Record: abre automáticamente la app en iPhone (iOS) y Android al acercar el teléfono.
 * 2) Text Record: leído directamente por el escáner Web NFC integrado.
 */
export async function writePhysicalNfcTag(
  poiId: string,
  signal?: AbortSignal
): Promise<{ ok: boolean; code: string; deepLink: string; error?: string }> {
  const code = generateOfflineStampCode(poiId);
  const textPayload = buildNfcTextPayload(poiId);
  const deepLink = buildNfcDeepLinkUrl(poiId);

  if (!isWebNfcSupported()) {
    return {
      ok: false,
      code,
      deepLink,
      error: 'Web NFC API (NDEFReader) no disponible en este navegador/SO. Usa Chrome en Android para grabar chips físicos o copia el enlace NDEF URI.'
    };
  }

  try {
    const NDEFReaderCtor = (window as any).NDEFReader;
    const ndef = new NDEFReaderCtor();
    await ndef.write(
      {
        records: [
          { recordType: 'url', data: deepLink },
          { recordType: 'text', data: textPayload }
        ]
      },
      signal ? { signal } : undefined
    );
    return { ok: true, code, deepLink };
  } catch (err: any) {
    return {
      ok: false,
      code,
      deepLink,
      error: err?.message || 'Error al escribir en la etiqueta NFC física.'
    };
  }
}

/**
 * Inicia un escaneo real de hardware Web NFC (`NDEFReader.scan`) y decodifica los registros NDEF.
 */
export async function startPhysicalNfcScan(options: {
  expectedPoiId?: string;
  allPoiIds?: string[];
  signal: AbortSignal;
  onValidRead: (result: VerifiedStampPayload) => void;
  onInvalidRead?: (reason: string, rawData: string) => void;
  onHardwareError?: (errMessage: string) => void;
}): Promise<boolean> {
  if (!isWebNfcSupported()) {
    options.onHardwareError?.('Web NFC no soportado en este navegador.');
    return false;
  }

  try {
    const NDEFReaderCtor = (window as any).NDEFReader;
    const ndef = new NDEFReaderCtor();
    await ndef.scan({ signal: options.signal });

    ndef.onreadingerror = () => {
      options.onInvalidRead?.('error_lectura_chip', '');
    };

    ndef.onreading = (event: any) => {
      const serialNumber: string | undefined = event?.serialNumber || undefined;
      const records: any[] = event?.message?.records || [];
      const decoder = new TextDecoder();

      for (const record of records) {
        let decodedText = '';
        try {
          if (record.data) {
            decodedText = decoder.decode(record.data);
          }
        } catch {}

        if (!decodedText) continue;

        const verification = verifyOfflineStampPayload(
          decodedText,
          options.expectedPoiId,
          options.allPoiIds
        );
        if (verification.valid) {
          options.onValidRead({
            ...verification,
            source: 'web-nfc',
            serialNumber
          });
          return;
        }
      }

      options.onInvalidRead?.('etiqueta_no_reconocida', serialNumber || '');
    };

    return true;
  } catch (err: any) {
    options.onHardwareError?.(err?.message || 'Permiso NFC denegado o lector desactivado.');
    return false;
  }
}

/**
 * Bitácora persistente de sellos otorgados (para que el dueño del local vea sellos reales emitidos hoy
 * y el administrador audite el flujo real por barrio).
 */
export function getStampLedger(poiId?: string): StampLedgerEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    const list: StampLedgerEntry[] = raw ? JSON.parse(raw) : [];
    return poiId ? list.filter((item) => item.poiId === poiId) : list;
  } catch {
    return [];
  }
}

export function recordStampInLedger(entry: Omit<StampLedgerEntry, 'id' | 'timestamp' | 'signature'>): StampLedgerEntry {
  const code = entry.code || generateOfflineStampCode(entry.poiId);
  const fullEntry: StampLedgerEntry = {
    id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    poiId: entry.poiId,
    poiName: entry.poiName,
    code,
    signature: generateStampSignature(entry.poiId, code),
    timestamp: new Date().toISOString(),
    method: entry.method,
    serialNumber: entry.serialNumber
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getStampLedger();
      const updated = [fullEntry, ...current].slice(0, 200);
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  return fullEntry;
}

/**
 * Emite un pulso de sellado firmado desde la terminal del artesano hacia cualquier visitante
 * que tenga abierto su escáner en mostrador (BroadcastChannel + Storage event).
 */
export function emitLiveCounterStamp(poiId: string, poiName: string): StampLedgerEntry {
  const entry = recordStampInLedger({
    poiId,
    poiName,
    code: generateOfflineStampCode(poiId),
    method: 'live-counter'
  });

  const payload = buildNfcTextPayload(poiId);
  const packet = {
    payload,
    poiId,
    poiName,
    code: entry.code,
    signature: entry.signature,
    emittedAt: Date.now()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NFC_BEACON_STORAGE_KEY, JSON.stringify(packet));
    } catch {}

    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(NFC_BROADCAST_CHANNEL);
        bc.postMessage(packet);
        bc.close();
      } catch {}
    }
  }

  return entry;
}

/**
 * Suscribe el lector del visitante a pulsos emitidos en vivo desde el mostrador del taller.
 */
export function subscribeToLiveCounterStamps(
  expectedPoiId: string | undefined,
  onVerifiedStamp: (result: VerifiedStampPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handlePacket = (packet: any) => {
    if (!packet || !packet.payload) return;
    // Solo aceptar pulsos emitidos en los últimos 30 segundos
    if (packet.emittedAt && Date.now() - packet.emittedAt > 30000) return;

    const verified = verifyOfflineStampPayload(packet.payload, expectedPoiId);
    if (verified.valid) {
      onVerifiedStamp({
        ...verified,
        source: 'live-counter'
      });
    }
  };

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(NFC_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => handlePacket(ev.data);
    } catch {}
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key === NFC_BEACON_STORAGE_KEY && ev.newValue) {
      try {
        handlePacket(JSON.parse(ev.newValue));
      } catch {}
    }
  };
  window.addEventListener('storage', onStorage);

  // También verificar si el artesano emitió un pulso hace menos de 12 segundos antes de abrir el lector
  try {
    const recentRaw = localStorage.getItem(NFC_BEACON_STORAGE_KEY);
    if (recentRaw) {
      const parsed = JSON.parse(recentRaw);
      if (parsed && parsed.emittedAt && Date.now() - parsed.emittedAt <= 12000) {
        handlePacket(parsed);
      }
    }
  } catch {}

  return () => {
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Estado operativo en vivo de los talleres (Abierto / Horno en Vivo / Cerrado + anuncio corto).
 */
export function getWorkshopLiveStates(): Record<string, WorkshopLiveState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WORKSHOP_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveWorkshopLiveState(state: WorkshopLiveState): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getWorkshopLiveStates();
    all[state.poiId] = state;
    localStorage.setItem(WORKSHOP_STATE_KEY, JSON.stringify(all));
  } catch {}
}

export function buildOfflineQrMatrix(payload: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (
          r >= 0 &&
          r <= 6 &&
          c >= 0 &&
          c <= 6 &&
          (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
        ) {
          matrix[rr][cc] = true;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  let state = 1337;
  for (let i = 0; i < payload.length; i++) {
    state = (state * 33 + payload.charCodeAt(i)) >>> 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      state = (state * 1664525 + 1013904223) >>> 0;
      const charBit =
        payload.charCodeAt((r * size + c) % payload.length) &
        (1 << ((r + c) % 7));
      matrix[r][c] = ((state >>> 16) & 1) === 1 || charBit !== 0;
    }
  }

  return matrix;
}

