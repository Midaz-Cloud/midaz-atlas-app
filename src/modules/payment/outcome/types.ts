export type OrderOutcomeVariant = 'success' | 'fiscal_error' | 'ticket_print_failed';

export type OrderSuccessDisplayMode = 'number' | 'qr';

export const ORDER_OUTCOME_AUTO_DISMISS_MS = 10_000;
