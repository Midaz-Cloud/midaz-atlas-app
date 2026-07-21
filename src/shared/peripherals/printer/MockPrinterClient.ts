import type { PrinterClient } from './PrinterClient';
import { sanitizePrinterText } from './sanitizePrinterText';

export class MockPrinterClient implements PrinterClient {
  async connect(): Promise<void> {
    if (__DEV__) {
      console.info('[Printer] MockPrinterClient.connect');
    }
  }

  async disconnect(): Promise<void> {
    if (__DEV__) {
      console.info('[Printer] MockPrinterClient.disconnect');
    }
  }

  async printText(text: string, merchantName?: string, qrValue?: string): Promise<void> {
    const safeText = sanitizePrinterText(text);
    const safeMerchant = sanitizePrinterText(merchantName ?? '');
    const safeQr = sanitizePrinterText(qrValue ?? '');
    if (__DEV__) {
      console.info('[Printer] MockPrinterClient.printText', safeMerchant, safeQr ? `QR=${safeQr}` : '', '\n', safeText);
    }
  }
}
