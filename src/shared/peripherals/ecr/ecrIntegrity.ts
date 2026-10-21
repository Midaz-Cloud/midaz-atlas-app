/* eslint-disable no-bitwise */
/**
 * Integridad de mensajes USB con PKUSB (desde PKUSB 1.0.7 / versionCode 16).
 *
 * Cada JSON viaja con un campo final `"crc"`: CRC32 en hex (8 dígitos, minúsculas)
 * del mismo JSON sin ese campo, en bytes UTF-8. Si no cuadra, el mensaje se dañó en
 * el cable y se pide de nuevo (`{ type: 'resend', referenceNo }`) en vez de adivinarlo.
 *
 * Mismo algoritmo que PKUSB `src/services/integrity.ts`.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return bytes;
}

export function crc32Hex(text: string): string {
  let crc = 0xffffffff;
  for (const b of utf8Bytes(text)) {
    crc = CRC_TABLE[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

/** Serializa `obj` y le agrega el campo `crc` al final. */
export function stringifyWithCrc(obj: object): string {
  const body = JSON.stringify(obj);
  const crc = crc32Hex(body);
  if (body === '{}') {
    return `{"crc":"${crc}"}`;
  }
  return `${body.slice(0, -1)},"crc":"${crc}"}`;
}

const CRC_TAIL = /,"crc":"([0-9a-f]{8})"\}$/;
/** Un crc con la clave o el valor dañados ("cr", "crx", 7 dígitos...) sigue siendo un crc. */
const DAMAGED_CRC_TAIL = /"[^"]{0,4}"\s*:\s*"[0-9a-f]{6,10}"\s*\}\s*$|"c?r?c"\s*:/;

/**
 * - `valid`: llegó tal cual salió de PKUSB.
 * - `invalid`: trae crc (o algo parecido) pero no cuadra: bytes dañados, pedir reenvío.
 * - `absent`: PKUSB viejo, sin crc; se procesa como antes.
 */
export type EcrCrcStatus = 'valid' | 'invalid' | 'absent';

export function verifyEcrCrc(payload: string): EcrCrcStatus {
  const line = payload.trim();
  const match = CRC_TAIL.exec(line);
  if (!match) {
    return DAMAGED_CRC_TAIL.test(line) ? 'invalid' : 'absent';
  }
  const body = `${line.slice(0, match.index)}}`;
  return crc32Hex(body) === match[1] ? 'valid' : 'invalid';
}

export function isStrictJson(payload: string): boolean {
  try {
    JSON.parse(payload);
    return true;
  } catch {
    return false;
  }
}

/** `result` numérico de una respuesta ya validada. */
export function readEcrResult(payload: string): number | undefined {
  const match = /"result"\s*:\s*(-?\d+)/.exec(payload);
  return match ? Number(match[1]) : undefined;
}
