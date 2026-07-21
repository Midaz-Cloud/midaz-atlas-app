import { resolveMobilePaymentPayerDocumentId } from '../resolveMobilePaymentPayerDocumentId';

describe('resolveMobilePaymentPayerDocumentId', () => {
  it('prefers payer override over billing document', () => {
    expect(
      resolveMobilePaymentPayerDocumentId('E87654321', 'V19301293'),
    ).toBe('E87654321');
  });

  it('falls back to billing when override is empty', () => {
    expect(resolveMobilePaymentPayerDocumentId(null, 'V19301293')).toBe('V19301293');
  });

  it('returns empty when neither is set', () => {
    expect(resolveMobilePaymentPayerDocumentId(null, undefined)).toBe('');
  });
});
