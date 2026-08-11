import {
  resolveReferenceErrorTitleKind,
} from '../resolveReferenceErrorTitle';

describe('resolveReferenceErrorTitleKind', () => {
  it('returns already_reconciled when backend message contains the phrase', () => {
    expect(
      resolveReferenceErrorTitleKind(
        'Pago móvil rechazado por DisGlobal: Pago ya conciliado previamente (ref: 123)',
      ),
    ).toBe('already_reconciled');
  });

  it('returns not_found for other messages or empty', () => {
    expect(resolveReferenceErrorTitleKind('Referencia no encontrada')).toBe(
      'not_found',
    );
    expect(resolveReferenceErrorTitleKind(undefined)).toBe('not_found');
    expect(resolveReferenceErrorTitleKind('')).toBe('not_found');
  });
});
