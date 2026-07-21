import { createFiscalClient } from './createFiscalClient';
import type { FiscalApiEnvelope, FiscalHealthData, FiscalHealthOptions } from './types';

/**
 * Consulta `GET /v1/health` del servicio fiscal local (HkaApp).
 *
 * Prueba manual contra dispositivo real:
 * 1. Abrir HkaApp (`com.thefactory.demoPP9`) en el kiosco.
 * 2. Opcional desde PC: `adb forward tcp:8765 tcp:8765`
 * 3. Llamar esta funcion (boton Home dev o script).
 *
 * Con `KIOSK_FISCAL_MOCK=true` no hace fetch real.
 */
export async function checkFiscalHealth(
  options?: FiscalHealthOptions,
): Promise<FiscalApiEnvelope<FiscalHealthData>> {
  const client = createFiscalClient();
  const result = await client.getHealth(options);
  return result.envelope;
}
