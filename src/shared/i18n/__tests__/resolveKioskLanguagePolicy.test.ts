import { resolveKioskLanguagePolicy } from '../resolveKioskLanguagePolicy';

describe('resolveKioskLanguagePolicy', () => {
  it('defaults to es only when languages missing', () => {
    expect(resolveKioskLanguagePolicy(null)).toEqual({
      enabledLocales: ['es'],
      defaultLocale: 'es',
      languageSwitcherEnabled: false,
    });
  });

  it('locks single locale without switcher', () => {
    expect(resolveKioskLanguagePolicy(['en'])).toEqual({
      enabledLocales: ['en'],
      defaultLocale: 'en',
      languageSwitcherEnabled: false,
    });
  });

  it('enables switcher for exactly two supported locales', () => {
    expect(resolveKioskLanguagePolicy(['es', 'en'])).toEqual({
      enabledLocales: ['es', 'en'],
      defaultLocale: 'es',
      languageSwitcherEnabled: true,
    });
  });

  it('does not enable switcher when more than two locales after filter', () => {
    const policy = resolveKioskLanguagePolicy(['es', 'en', 'fr', 'de']);
    expect(policy.enabledLocales).toEqual(['es', 'en']);
    expect(policy.languageSwitcherEnabled).toBe(false);
  });
});
