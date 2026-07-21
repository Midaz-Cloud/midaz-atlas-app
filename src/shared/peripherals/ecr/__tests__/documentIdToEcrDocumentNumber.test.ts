import {
  documentIdToEcrDocumentNumber,
  EcrDocumentNumberError,
} from '../documentIdToEcrDocumentNumber';

describe('documentIdToEcrDocumentNumber', () => {
  it('maps V cedula to full numeric digits (8 digits)', () => {
    expect(documentIdToEcrDocumentNumber('V26396697')).toBe('26396697');
  });

  it('pads short numbers', () => {
    expect(documentIdToEcrDocumentNumber('V42')).toBe('0000042');
  });

  it('throws on empty document', () => {
    expect(() => documentIdToEcrDocumentNumber('')).toThrow(EcrDocumentNumberError);
  });
});
