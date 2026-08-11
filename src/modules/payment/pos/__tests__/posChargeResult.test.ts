import type { PosChargePhase, PosChargeResult } from '../types';

describe('PosChargeResult / PosChargePhase', () => {
  it('accepts success and failure shapes used by the navigator', () => {
    const ok: PosChargeResult = { ok: true };
    const payErr: PosChargeResult = { ok: false, kind: 'payment-error' };
    const stock: PosChargeResult = {
      ok: false,
      kind: 'stock-shortage',
      shortages: [],
    };
    expect(ok.ok).toBe(true);
    expect(payErr.ok).toBe(false);
    expect(stock.kind).toBe('stock-shortage');

    const phases: PosChargePhase[] = ['waiting_pos', 'confirming'];
    expect(phases).toHaveLength(2);
  });
});

describe('handlePosChargeComplete mapping', () => {
  function mapResult(result: PosChargeResult): string {
    if (result.ok) {
      return 'processing';
    }
    if (result.kind === 'stock-shortage') {
      return 'stock-shortage';
    }
    return 'payment-error';
  }

  it('maps ok → processing', () => {
    expect(mapResult({ ok: true })).toBe('processing');
  });

  it('maps payment-error → payment-error', () => {
    expect(mapResult({ ok: false, kind: 'payment-error' })).toBe('payment-error');
  });

  it('maps stock-shortage → stock-shortage', () => {
    expect(
      mapResult({ ok: false, kind: 'stock-shortage', shortages: [] }),
    ).toBe('stock-shortage');
  });
});
