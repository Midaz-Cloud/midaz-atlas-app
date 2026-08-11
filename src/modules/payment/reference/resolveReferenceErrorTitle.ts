/** Backend phrase used only to pick UI title — not shown raw on screen. */
export const ALREADY_RECONCILED_MESSAGE_SNIPPET =
  'Pago ya conciliado previamente';

export type ReferenceErrorTitleKind = 'not_found' | 'already_reconciled';

/**
 * Maps validate-payment API `message` to a fixed UI title.
 * Raw backend message is not displayed (for now).
 */
export function resolveReferenceErrorTitleKind(
  backendMessage: string | undefined,
): ReferenceErrorTitleKind {
  if (backendMessage?.includes(ALREADY_RECONCILED_MESSAGE_SNIPPET)) {
    return 'already_reconciled';
  }
  return 'not_found';
}
