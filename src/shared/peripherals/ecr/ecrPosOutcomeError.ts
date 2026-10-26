/**
 * El POS no dejó claro si cobró: no es un rechazo y no se puede volver a cobrar sin
 * revisar el datáfono, o se cobraría dos veces.
 *
 * - `unconfirmed`: venció la espera (timeout sin respuesta, `CANCELLED_NO_RESPONSE`
 *   sin resultado tardío) o PKUSB ya no tiene la respuesta (`-96`).
 * - `previous_pending`: PKUSB no ejecutó este cobro porque el anterior sigue sin
 *   respuesta del SDK (`-99`). Este no se cobró; el anterior está en duda.
 *
 * `message` es técnico y va a `failed_payments`; al cliente se le muestra un texto
 * propio según `outcome`, nunca este.
 */
export type EcrPosOutcome = 'unconfirmed' | 'previous_pending';

export class EcrPosOutcomeError extends Error {
  readonly outcome: EcrPosOutcome;

  constructor(outcome: EcrPosOutcome, message: string) {
    super(message);
    this.name = 'EcrPosOutcomeError';
    this.outcome = outcome;
  }
}

export function isEcrPosOutcomeError(error: unknown): error is EcrPosOutcomeError {
  return error instanceof EcrPosOutcomeError;
}
