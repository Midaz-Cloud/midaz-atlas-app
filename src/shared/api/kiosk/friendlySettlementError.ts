import { KioskApiError } from '@shared/api/kiosk/errors';

/**
 * Maps settlement/backend failures to short, non-technical Spanish copy for kiosk UI.
 * Technical details stay in console logs.
 */
export function friendlySettlementErrorMessage(error: unknown): string {
  if (error instanceof KioskApiError) {
    return friendlyFromStatusAndMessage(error.statusCode, error.message, error.body?.message);
  }
  if (error instanceof Error) {
    return friendlyFromStatusAndMessage(undefined, error.message);
  }
  return friendlyFromStatusAndMessage(undefined, String(error));
}

function friendlyFromStatusAndMessage(
  statusCode: number | undefined,
  rawMessage: string,
  bodyMessage?: string,
): string {
  const text = `${bodyMessage ?? ''} ${rawMessage}`.toLowerCase();

  if (statusCode === 401 || /no est[aá]s autenticado|unauthorized|token/i.test(text)) {
    return 'No se pudo autenticar el kiosco. Vuelve a iniciar la app e intenta de nuevo.';
  }
  if (statusCode === 409 || /ya fue registrado|duplicad/i.test(text)) {
    return 'Este cierre de lote ya estaba registrado en el servidor.';
  }
  if (/falta el serial|serial del pos/i.test(text)) {
    return 'No se encontró el serial del datáfono. Realiza un cobro POS primero e intenta de nuevo.';
  }
  if (/no est[aá] registrado en esta sucursal/i.test(text)) {
    return 'El datáfono no está registrado en esta sucursal. Contacta a soporte.';
  }
  if (statusCode === 404 || /cannot post|not found/i.test(text)) {
    return 'El servidor no pudo recibir el cierre de lote. Intenta más tarde o contacta a soporte.';
  }
  if (statusCode === 400 || /bad request/i.test(text)) {
    return 'Los datos del cierre no fueron aceptados por el servidor. Verifica el datáfono e intenta de nuevo.';
  }
  if (statusCode != null && statusCode >= 500) {
    return 'El servidor tuvo un problema al registrar el cierre. Intenta más tarde.';
  }
  if (/network|failed to fetch|timeout|timed out|econnrefused/i.test(text)) {
    return 'No hay conexión con el servidor. Revisa la red e intenta de nuevo.';
  }

  return 'No se pudo registrar el cierre en el servidor. Intenta de nuevo.';
}

export function formatUserFacingError(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    return 'Ocurrió un error. Intenta de nuevo.';
  }
  if (/^ocurri[oó] un error/i.test(trimmed)) {
    return trimmed;
  }
  return `Ocurrió un error. ${trimmed}`;
}
