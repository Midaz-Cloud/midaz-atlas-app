/** USB often breaks `"61552000014"0` → intended RRN `615520000014`. */
function repairBrokenQuoteRrn(base: string, trailing?: string): string {
  if (trailing === '0' && base.length >= 10 && base.length <= 12) {
    return `${base.slice(0, -2)}0${base.slice(-2)}`;
  }
  return [base, trailing].filter(Boolean).join('');
}

describe('repairBrokenQuoteRrn', () => {
  it('inserts missing zero before trace suffix when quote breaks on terminal', () => {
    expect('61552000014' + '0').toBe('615520000140');
    expect(repairBrokenQuoteRrn('61552000014', '0')).toBe('615520000014');
  });
});
