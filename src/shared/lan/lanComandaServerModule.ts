import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type LanNativeRequest = {
  requestId: string;
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  body: string;
};

export type LanAddress = { interface: string; address: string };

type LanComandaServerNative = {
  start(port: number, authKey: string): Promise<number>;
  stop(): Promise<void>;
  setAuthKey(authKey: string): Promise<void>;
  isRunning(): Promise<boolean>;
  respond(
    requestId: string,
    status: number,
    body: string,
    headers: Record<string, string> | null,
  ): Promise<boolean>;
  getLanAddresses(): Promise<LanAddress[]>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

export const LAN_REQUEST_EVENT = 'LanComandaRequest';

/** null fuera de Android o en un APK viejo sin el módulo (se sigue vendiendo igual). */
export function getLanComandaServerNative(): LanComandaServerNative | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  return (NativeModules.LanComandaServerModule as LanComandaServerNative | undefined) ?? null;
}

export function createLanEventEmitter(native: LanComandaServerNative): NativeEventEmitter {
  return new NativeEventEmitter(native as never);
}
