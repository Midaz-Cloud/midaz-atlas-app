/**
 * Fallas simuladas del cable USB con PKUSB, solo en builds de debug (`__DEV__`).
 * Sirven para ver en el equipo real cómo se recupera el cliente cuando un mensaje
 * llega dañado; en release nunca corrompen nada, elija lo que elija el botón.
 *
 * - `response_once`: la primera respuesta de un cobro o cierre llega con un byte
 *   cambiado (crc inválido). Se pide `resend` y PKUSB entrega su copia íntegra.
 * - `response_always`: todas las respuestas de ese cobro o cierre llegan dañadas;
 *   a los 45 s se usa la última copia dañada con el parser tolerante.
 * - `request_once`: el pedido de cobro o cierre sale dañado hacia PKUSB, que no lo
 *   ejecuta y contesta -94; el cliente lo reenvía limpio.
 *
 * Nunca toca el chequeo de versión: ese corre antes de cada cobro y bloquearía la prueba.
 */
export type EcrFaultMode = 'off' | 'response_once' | 'response_always' | 'request_once';

export const ECR_FAULT_MODES: readonly EcrFaultMode[] = [
  'off',
  'response_once',
  'response_always',
  'request_once',
];

/** El nativo entrega cada línea dos veces (comando + línea): ambas copias van dañadas. */
const DUPLICATE_DELIVERY_MS = 500;

let mode: EcrFaultMode = 'off';
let responseState: { referenceNo: string; at: number } | null = null;
const corruptedRequests = new Set<string>();

export function getEcrFaultMode(): EcrFaultMode {
  return mode;
}

export function setEcrFaultMode(next: EcrFaultMode): void {
  mode = next;
  responseState = null;
  corruptedRequests.clear();
}

function isActive(): boolean {
  return __DEV__ && mode !== 'off';
}

function appliesTo(type: string | undefined): boolean {
  return type === 'payment' || type === 'settlement';
}

/** Cambia un carácter del medio del JSON por otro distinto: el crc deja de cuadrar. */
export function corruptEcrLine(line: string): string {
  const index = Math.floor(line.length / 2);
  const original = line[index];
  const replacement = original === 'x' ? 'y' : 'x';
  return `${line.slice(0, index)}${replacement}${line.slice(index + 1)}`;
}

function logFault(message: string) {
  if (__DEV__) {
    console.warn(`[ECR-FAULT] ${message}`);
  }
}

/** Respuesta recibida para el pedido pendiente: la devuelve dañada si el modo lo pide. */
export function applyEcrResponseFault(
  payload: string,
  pending: { referenceNo: string; type: string } | undefined,
): string {
  if (!isActive() || !pending || !appliesTo(pending.type)) {
    return payload;
  }
  if (mode === 'response_always') {
    logFault(`respuesta de ${pending.referenceNo} dañada (siempre)`);
    return corruptEcrLine(payload);
  }
  if (mode !== 'response_once') {
    return payload;
  }
  const now = Date.now();
  if (responseState?.referenceNo !== pending.referenceNo) {
    responseState = { referenceNo: pending.referenceNo, at: now };
    logFault(`respuesta de ${pending.referenceNo} dañada (una vez)`);
    return corruptEcrLine(payload);
  }
  if (now - responseState.at < DUPLICATE_DELIVERY_MS) {
    return corruptEcrLine(payload);
  }
  return payload;
}

/** Pedido a punto de salir por USB: la primera vez de cada operación sale dañado. */
export function applyEcrRequestFault(
  line: string,
  request: { referenceNo?: string; type?: string },
): string {
  if (!isActive() || mode !== 'request_once' || !request.referenceNo || !appliesTo(request.type)) {
    return line;
  }
  if (corruptedRequests.has(request.referenceNo)) {
    return line;
  }
  corruptedRequests.add(request.referenceNo);
  logFault(`pedido ${request.referenceNo} sale dañado`);
  return corruptEcrLine(line);
}
