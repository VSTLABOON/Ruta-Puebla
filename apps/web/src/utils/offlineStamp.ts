/**
 * Utilidades Offline para Sellado de Pasaporte Cultural mediante NFC (Web NFC API)
 * y Código QR / Token determinista sin necesidad de conexión a internet.
 */

export function generateOfflineStampCode(poiId: string): string {
  let hash = 2166136261;
  const seed = `RUTA-PUEBLA-2026:${poiId}`;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const num = Math.abs(hash) % 9000 + 1000;
  const prefix = poiId
    .replace('poi_', '')
    .slice(0, 3)
    .toUpperCase();
  return `${prefix}-${num}`;
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

export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}
