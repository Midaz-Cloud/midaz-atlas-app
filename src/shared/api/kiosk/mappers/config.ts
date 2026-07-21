import type { KioskConfigResponse } from '../types';

export type KioskRuntimeConfig = {
  raw: KioskConfigResponse;
  foodServiceEnabled: boolean;
  tableFieldEnabled: boolean;
  printQrEnabled: boolean;
  comandaModel: 'printed' | 'sent';
  enabledPaymentMethods: KioskConfigResponse['enabledPaymentMethods'];
  appearance: KioskConfigResponse['appearance'];
  organization: KioskConfigResponse['organization'];
  /** Derived: show P3 when food service modes are enabled. */
  orderTypeSelectionEnabled: boolean;
};

export function mapConfigToRuntime(config: KioskConfigResponse): KioskRuntimeConfig {
  return {
    raw: config,
    foodServiceEnabled: config.foodServiceEnabled,
    tableFieldEnabled: config.tableFieldEnabled,
    printQrEnabled: config.printQrEnabled,
    comandaModel: config.comandaModel,
    enabledPaymentMethods: config.enabledPaymentMethods,
    appearance: config.appearance,
    organization: config.organization,
    orderTypeSelectionEnabled: config.foodServiceEnabled,
  };
}
