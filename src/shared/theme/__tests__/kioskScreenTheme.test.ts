import { buildKioskScreenColors, colorWithAlpha } from '../kioskScreenTheme';

describe('kioskScreenTheme', () => {
  it('maps appearance primary and secondary onto ordering tokens', () => {
    const colors = buildKioskScreenColors({
      primaryColor: '#112233',
      secondaryColor: '#445566',
    });

    expect(colors.priceAccent).toBe('#112233');
    expect(colors.cartBar).toBe('#112233');
    expect(colors.cartBadge).toBe('#445566');
    expect(colors.title).toBe('#445566');
    expect(colors.categorySelectedBorder).toBe('#112233');
    expect(colors.searchBorderFocusBlue).toBe('#112233');
    expect(colors.searchBorderDefault).toBe(colorWithAlpha('#445566', 0.35));
  });

  it('maps payment and customer input tokens', () => {
    const colors = buildKioskScreenColors({
      primaryColor: '#112233',
      secondaryColor: '#445566',
    });

    expect(colors.paymentReferenceInputBorder).toBe(colorWithAlpha('#445566', 0.2));
    expect(colors.paymentReferenceMuted).toBe(colorWithAlpha('#445566', 0.55));
    expect(colors.paymentMethodRadioSelected).toBe('#112233');
    expect(colors.paymentMethodIconBg).toBe(colorWithAlpha('#112233', 0.08));
    expect(colors.paymentOutcomeAccent).toBe('#112233');
    expect(colors.paymentOutcomeQrPaymentStatus).toBe('#112233');
    expect(colors.subtitle).toBe(colors.menuSectionMuted);
  });

  it('falls back to brand defaults when appearance is null', () => {
    const colors = buildKioskScreenColors(null);
    expect(colors.priceAccent).toBeTruthy();
    expect(colors.cartBar).toBeTruthy();
  });
});
