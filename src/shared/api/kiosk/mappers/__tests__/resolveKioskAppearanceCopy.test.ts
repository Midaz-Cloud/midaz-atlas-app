import { resolveKioskAppearanceCopy } from '../resolveKioskAppearanceCopy';

describe('resolveKioskAppearanceCopy', () => {
  const appearance = {
    title: 'Bienvenido',
    subtitle: 'Pedí aquí',
    translations: {
      en: { title: 'Welcome', subtitle: 'Order here' },
    },
  };

  it('uses localized copy when available', () => {
    expect(resolveKioskAppearanceCopy(appearance, 'en')).toEqual({
      title: 'Welcome',
      subtitle: 'Order here',
    });
  });

  it('falls back to default title/subtitle for missing locale', () => {
    expect(resolveKioskAppearanceCopy(appearance, 'es')).toEqual({
      title: 'Bienvenido',
      subtitle: 'Pedí aquí',
    });
  });
});
