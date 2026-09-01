import { parseEcrPaymentJson } from './parseEcrPaymentJson';
import type { UseUsbECRReturn } from './useUsbECR';

/**
 * PKUSB app (`versionCode` de android/app/build.gradle) y veslc (`cn.nexgo.veslc`)
 * validados este ciclo. Si el datáfono conectado trae otra versión, su comportamiento
 * puede haber cambiado sin aviso (pasó en producción) — no confiar en un pago/cierre
 * hecho contra un SDK sin verificar.
 */
export const EXPECTED_PKUSB_APP_VERSION_CODE = 15;
export const EXPECTED_VESLC_VERSION_CODE = 117;

export type PosVersionCheck =
  | {
      ok: true;
      appVersionCode: number;
      veslcVersionCode: number;
    }
  | {
      ok: false;
      reason: 'mismatch' | 'veslc_missing' | 'no_response';
      appVersionCode?: number;
      veslcVersionCode?: number;
      details?: string;
    };

/** Manda `{ type: 'version' }` por USB y valida la respuesta contra lo pineado arriba. */
export async function checkPosVersion(
  ecr: Pick<UseUsbECRReturn, 'performVersionCheck'>,
): Promise<PosVersionCheck> {
  let raw: string;
  try {
    raw = await ecr.performVersionCheck();
  } catch (error) {
    return {
      ok: false,
      reason: 'no_response',
      details: error instanceof Error ? error.message : String(error),
    };
  }

  const flat = parseEcrPaymentJson(raw);
  if (!flat) {
    return { ok: false, reason: 'no_response', details: raw };
  }

  const appVersionCode = Number(flat.appVersionCode);
  const veslcInstalled = flat.veslcInstalled === true;
  const veslcVersionCode = Number(flat.veslcVersionCode);

  if (!veslcInstalled) {
    return { ok: false, reason: 'veslc_missing', appVersionCode };
  }

  if (
    appVersionCode !== EXPECTED_PKUSB_APP_VERSION_CODE ||
    veslcVersionCode !== EXPECTED_VESLC_VERSION_CODE
  ) {
    return {
      ok: false,
      reason: 'mismatch',
      appVersionCode,
      veslcVersionCode,
      details: `PKUSB app=${appVersionCode} (esperado ${EXPECTED_PKUSB_APP_VERSION_CODE}), veslc=${veslcVersionCode} (esperado ${EXPECTED_VESLC_VERSION_CODE})`,
    };
  }

  return { ok: true, appVersionCode, veslcVersionCode };
}

/** Mensaje para el operador/cliente cuando el chequeo de versión falla. */
export function posVersionCheckMessage(check: PosVersionCheck): string {
  if (check.ok) {
    return '';
  }
  switch (check.reason) {
    case 'mismatch':
      return 'El datáfono no tiene la versión correcta instalada. Instale la versión correcta de PKUSB.';
    case 'veslc_missing':
      return 'No se encontró la app financiera en el datáfono. Instale la versión correcta de PKUSB.';
    case 'no_response':
    default:
      return 'No se pudo verificar la versión del datáfono. Verifique la conexión USB.';
  }
}
