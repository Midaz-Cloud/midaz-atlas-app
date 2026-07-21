import { NativeModules } from 'react-native';

export type UsbEcrDiagnosticSnapshot = {
  totalBytes: number;
  chunkCount: number;
  assemblyMs: number;
  payloadChars: number;
  strictJsonValid: boolean;
  hasResponseCode00: boolean;
  hasApprovedHint: boolean;
  hexPreview: string;
  vid: number;
  pid: number;
};

export type UsbSerialNativeModule = {
  initialize(): Promise<void>;
  requestUsbPermission(): Promise<void>;
  close(): Promise<void>;
  sendLine(line: string): Promise<void>;
  setDiagnosticEnabled?(enabled: boolean): Promise<boolean>;
  isDiagnosticEnabled?(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

export function getUsbSerialModule(): UsbSerialNativeModule | null {
  const mod = (NativeModules as { UsbSerialModule?: UsbSerialNativeModule }).UsbSerialModule;
  return mod ?? null;
}

export function isUsbSerialModuleAvailable(): boolean {
  return getUsbSerialModule() != null;
}
