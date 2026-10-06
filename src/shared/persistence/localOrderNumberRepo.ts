import { getKioskSqliteDb } from './sqliteDb';
import { rowNumber } from './rowValues';

const LOCAL_ORDER_SEQ = 'local_order_seq';

/**
 * Número impreso en el ticket cuando la venta se registra sin backend.
 * `K` + últimos 3 caracteres del serial (distingue kioskos en la misma cocina) +
 * secuencia de 4 dígitos (crece si pasa de 9999). Ej.: "K040-0042".
 */
export function buildLocalOrderNumber(deviceSerial: string, seq: number): string {
  const suffix = deviceSerial.replace(/[^a-z0-9]/gi, '').slice(-3).toUpperCase() || 'KSK';
  return `K${suffix}-${String(seq).padStart(4, '0')}`;
}

/**
 * Siguiente número local. Una sola sentencia (upsert + RETURNING) para que sea
 * atómica; el contador nunca se reinicia (ni en el cierre de lote), así un
 * número local nunca se repite en el mismo kiosko.
 */
export async function allocateLocalOrderNumber(
  deviceSerial: string,
): Promise<{ localNumber: string; seq: number }> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `INSERT INTO kiosk_counters (name, value) VALUES (?, 1)
     ON CONFLICT(name) DO UPDATE SET value = value + 1
     RETURNING value;`,
    [LOCAL_ORDER_SEQ],
  );
  const seq = rowNumber((result.rows?.[0] as { value?: unknown } | undefined)?.value);
  if (seq == null) {
    throw new Error('No se pudo asignar el número de orden local');
  }
  return { localNumber: buildLocalOrderNumber(deviceSerial, seq), seq };
}
