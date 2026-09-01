import { lookupPrefillDisplayName, type LookupCustomerResult } from '@shared/api/kiosk';

import type { CustomerLookupStatus } from './customer-register/components/CustomerLookupStatusBanner';

export function buildCustomerLookupStatus(
  result: Extract<LookupCustomerResult, { status: 'register' | 'not_found' | 'error' }>,
): CustomerLookupStatus {
  if (result.status === 'register' && result.prefill) {
    const source = result.lookupSource === 'org' ? 'org' : 'cne';
    return {
      kind: 'prefill',
      source,
      name: lookupPrefillDisplayName(result.prefill),
      documentId: result.documentId,
    };
  }
  if (result.status === 'register') {
    return { kind: 'not_found', documentId: result.documentId };
  }
  if (result.status === 'not_found') {
    return { kind: 'not_found', documentId: result.documentId };
  }
  if (result.status === 'error') {
    return {
      kind: 'error',
      message: result.message,
      documentId: result.documentId,
    };
  }
  return { kind: 'not_found', documentId: (result as any)?.documentId ?? '' };
}
