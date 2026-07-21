import { NativeModules } from 'react-native';
import Config from 'react-native-config';

import { parseBooleanEnv } from './env';

const { PrinterModule2 } = NativeModules as {
  PrinterModule2?: object;
};

export function isNativePrinterModuleAvailable(): boolean {
  return PrinterModule2 != null;
}

/** Force mock printer (emulator / CI). Literal `true` only. */
export function shouldUseMockPrinter(): boolean {
  return parseBooleanEnv(Config.KIOSK_PRINTER_MOCK);
}

export function shouldUsePrinterHardware(): boolean {
  if (shouldUseMockPrinter()) {
    return false;
  }
  return isNativePrinterModuleAvailable();
}
