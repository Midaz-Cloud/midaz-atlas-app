/** Máximo de dígitos numéricos que acepta el datáfono (cédula V/E/J sin prefijo). */
export const ECR_DOCUMENT_NUMBER_MAX_LENGTH = 9;

/**
 * Normaliza el número de documento para el JSON `documentNumber` del datáfono.
 * - Solo dígitos (sin V/E/J).
 * - Si tiene menos de 7 dígitos, rellena con ceros a la izquierda.
 * - Si tiene 7–9 dígitos (cédula/RIF venezolano), envía el valor completo.
 * @see docs/useUsbECR.ts — el payload envía `documentNumber` tal cual, sin recortar.
 */
export function formatEcrDocumentNumber(input?: string | number): string {
  if (input != null && input !== '') {
    const digitsOnly = String(input).replace(/\D/g, '');
    if (digitsOnly.length > 0) {
      if (digitsOnly.length < 7) {
        return digitsOnly.padStart(7, '0');
      }
      if (digitsOnly.length <= ECR_DOCUMENT_NUMBER_MAX_LENGTH) {
        return digitsOnly;
      }
      return digitsOnly.slice(-ECR_DOCUMENT_NUMBER_MAX_LENGTH);
    }
  }

  return String(Date.now() % 10_000_000).padStart(7, '0');
}
