import type { AppLocale } from '@shared/i18n/types';

import type { KioskRuntimeConfig } from '@shared/api/kiosk/mappers/config';

export const kioskConfig = {
  /** P2 no está en el flujo principal; solo accesible desde el botón de idioma en P1. */
  languageSelectionEnabled: false,
  orderTypeSelectionEnabled: true,
  /** P14 vs P15 en Storybook; en app usa `printQrEnabled` de config. */
  orderSuccessDisplayMode: 'number' as const satisfies 'number' | 'qr',
  /**
   * P16 · sesión de compra: 5 min total.
   * Aviso tras 4 min 30 s de inactividad; 30 s de cuenta regresiva antes de cerrar.
   */
  inactivityIdleMs: 270_000,
  inactivityGraceMs: 30_000,
  /** P19 · cancelación si el cajero no atiende. */
  assistanceTimeoutMs: 300_000,
  /** P17 · alerta sin stock (mock hasta API de inventario). */
  stockAlertEnabled: true,
  defaultLocale: 'es' as AppLocale,
  supportedLocales: ['es', 'en'] as const satisfies readonly AppLocale[],
};

/** Merges API runtime flags into static kiosk defaults. */
export function mergeKioskRuntimeFlags(runtime: KioskRuntimeConfig | null): {
  orderTypeSelectionEnabled: boolean;
  tableFieldEnabled: boolean;
  printQrEnabled: boolean;
  stockAlertEnabled: boolean;
} {
  return {
    orderTypeSelectionEnabled:
      runtime?.orderTypeSelectionEnabled ?? kioskConfig.orderTypeSelectionEnabled,
    tableFieldEnabled: runtime?.tableFieldEnabled ?? false,
    printQrEnabled: runtime?.printQrEnabled ?? false,
    stockAlertEnabled: kioskConfig.stockAlertEnabled,
  };
}