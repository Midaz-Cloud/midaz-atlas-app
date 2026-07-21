export type KioskFlowStep = 'introduction' | 'ordering' | 'payment';

export type ResetKioskSessionOptions = {
  flowStep: KioskFlowStep;
  setFlowStep: (step: KioskFlowStep) => void;
  resetLocale: () => Promise<void>;
  /** Vacía carrito y totales de pedido (`useKioskOrder().resetOrder`). */
  resetOrder?: () => void;
  /** Limpia cliente identificado en sesión. */
  clearCustomer?: () => void;
};

/**
 * Reinicia la sesión del kiosk (carrito + cliente + locale + flujo → intro).
 * Usar al volver a home desde menú/scan, idle timeout, o fin de pago.
 */
export async function resetKioskSession({
  flowStep: _flowStep,
  setFlowStep,
  resetLocale,
  resetOrder,
  clearCustomer,
}: ResetKioskSessionOptions): Promise<void> {
  resetOrder?.();
  clearCustomer?.();
  await resetLocale();
  setFlowStep('introduction');
}

export function getInitialFlowStep(): KioskFlowStep {
  return 'introduction';
}
