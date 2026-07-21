import { NativeModules } from 'react-native';

import type { PrinterClient } from './PrinterClient';
import { sanitizePrinterText } from './sanitizePrinterText';

type PrinterModuleNative = {
  connectPrinter(): Promise<string>;
  printText(text: string, merchantName: string, qrValue: string): Promise<string>;
  disconnect(): Promise<string>;
};

const { PrinterModule2 } = NativeModules as {
  PrinterModule2?: PrinterModuleNative;
};

export class NativePrinterClient implements PrinterClient {
  private get native(): PrinterModuleNative {
    if (!PrinterModule2) {
      throw new Error('PrinterModule2 native module is not available');
    }
    return PrinterModule2;
  }

  async connect(): Promise<void> {
    await this.native.connectPrinter();
  }

  async disconnect(): Promise<void> {
    await this.native.disconnect();
  }

  async printText(text: string, merchantName?: string, qrValue?: string): Promise<void> {
    await this.native.printText(
      sanitizePrinterText(text),
      sanitizePrinterText(merchantName ?? ''),
      sanitizePrinterText(qrValue ?? ''),
    );
  }
}
