import { shouldUsePrinterHardware } from '@shared/config';

import type { PrinterClient } from './PrinterClient';
import { MockPrinterClient } from './MockPrinterClient';
import { NativePrinterClient } from './NativePrinterClient';

let singleton: PrinterClient | null = null;

export function createPrinterClient(): PrinterClient {
  if (!singleton) {
    singleton = shouldUsePrinterHardware()
      ? new NativePrinterClient()
      : new MockPrinterClient();
  }
  return singleton;
}

export function resetPrinterClientForTests(): void {
  singleton = null;
}
