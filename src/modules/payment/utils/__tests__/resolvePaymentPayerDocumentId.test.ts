import { resolvePaymentPayerDocumentId } from '../resolvePaymentPayerDocumentId';

describe('resolvePaymentPayerDocumentId', () => {
  it('prefers payer override over billing document', () => {
    expect(
      resolvePaymentPayerDocumentId('E87654321', 'V19301293'),
    ).toBe('E87654321');
  });

  it('falls back to billing when override is empty', () => {
    expect(resolvePaymentPayerDocumentId(null, 'V19301293')).toBe('V19301293');
  });
});
