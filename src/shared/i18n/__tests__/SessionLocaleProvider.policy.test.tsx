import ReactTestRenderer, { act } from 'react-test-renderer';

import { SessionLocaleProvider } from '../SessionLocaleProvider';
import { useSessionLocale } from '../useSessionLocale';
import type { KioskLanguagePolicy } from '../resolveKioskLanguagePolicy';

type SessionLocaleContextValue = ReturnType<typeof useSessionLocale>;

function Harness({
  onReady,
}: {
  onReady: (value: SessionLocaleContextValue) => void;
}) {
  const value = useSessionLocale();
  onReady(value);
  return null;
}

async function renderHarness() {
  let latest!: SessionLocaleContextValue;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SessionLocaleProvider initialLocale="es">
        <Harness
          onReady={(value) => {
            latest = value;
          }}
        />
      </SessionLocaleProvider>,
    );
  });
  return {
    renderer,
    get value() {
      return latest;
    },
  };
}

const esPolicy: KioskLanguagePolicy = {
  enabledLocales: ['es', 'en'],
  defaultLocale: 'es',
  languageSwitcherEnabled: true,
};

const enDefaultPolicy: KioskLanguagePolicy = {
  enabledLocales: ['es', 'en'],
  defaultLocale: 'en',
  languageSwitcherEnabled: true,
};

describe('SessionLocaleProvider language policy', () => {
  it(
    'does not reset a customer-chosen locale when the same policy is re-applied',
    async () => {
      const harness = await renderHarness();

      await act(async () => {
        await harness.value.applyLanguagePolicy(esPolicy);
      });
      expect(harness.value.locale).toBe('es');

      // Cliente cambia a inglés a mitad de la compra.
      await act(async () => {
        await harness.value.setLocale('en');
      });
      expect(harness.value.locale).toBe('en');

      // Refresco de catálogo/config con la MISMA política (cada 60s / tras
      // venta): no debe pisar el idioma que el cliente eligió.
      await act(async () => {
        await harness.value.applyLanguagePolicy(esPolicy);
      });
      expect(harness.value.locale).toBe('en');

      await act(async () => {
        harness.renderer.unmount();
      });
    },
    15000,
  );

  it(
    'applies a genuinely new default locale from the panel',
    async () => {
      const harness = await renderHarness();

      await act(async () => {
        await harness.value.applyLanguagePolicy(esPolicy);
      });
      await act(async () => {
        await harness.value.setLocale('en');
      });
      expect(harness.value.locale).toBe('en');

      // El admin cambió el idioma por defecto del panel a inglés — la sesión
      // debe adoptarlo aunque no coincida con lo que el cliente tenía.
      await act(async () => {
        await harness.value.applyLanguagePolicy(enDefaultPolicy);
      });
      expect(harness.value.locale).toBe('en');

      await act(async () => {
        harness.renderer.unmount();
      });
    },
    15000,
  );

  it(
    'resetSession is a no-op when already at the config default',
    async () => {
      const harness = await renderHarness();

      await act(async () => {
        await harness.value.applyLanguagePolicy(esPolicy);
      });
      expect(harness.value.locale).toBe('es');

      await act(async () => {
        await harness.value.resetSession();
      });
      expect(harness.value.locale).toBe('es');

      await act(async () => {
        harness.renderer.unmount();
      });
    },
    15000,
  );
});
