import { useCallback, useEffect, useState } from 'react';
import { NativeEventEmitter } from 'react-native';

import { showKioskDevUi } from '@shared/config';

import { getUsbSerialModule } from './usbSerialModule';

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
  timestamp: number;
};

export type UseEcrUsbDiagnosticReturn = {
  enabled: boolean;
  lastSnapshot: UsbEcrDiagnosticSnapshot | null;
  recentLogs: string[];
  setEnabled: (value: boolean) => Promise<void>;
  clearLogs: () => void;
};

const MAX_LOGS = 40;

export function useEcrUsbDiagnostic(): UseEcrUsbDiagnosticReturn {
  const [enabled, setEnabledState] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<UsbEcrDiagnosticSnapshot | null>(null);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);

  const appendLog = useCallback((message: string) => {
    setRecentLogs((prev) => [message, ...prev].slice(0, MAX_LOGS));
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    const mod = getUsbSerialModule();
    if (mod?.setDiagnosticEnabled) {
      await mod.setDiagnosticEnabled(value);
    }
    setEnabledState(value);
  }, []);

  const clearLogs = useCallback(() => {
    setRecentLogs([]);
    setLastSnapshot(null);
  }, []);

  useEffect(() => {
    const mod = getUsbSerialModule();
    if (mod == null) {
      return;
    }

    const emitter = new NativeEventEmitter(mod);
    const autoEnable = showKioskDevUi();

    if (autoEnable && mod.setDiagnosticEnabled) {
      void mod.setDiagnosticEnabled(true).then(() => setEnabledState(true));
    }

    const diagnosticSub = emitter.addListener(
      'onUsbDiagnostic',
      (event: UsbEcrDiagnosticSnapshot) => {
        setLastSnapshot({ ...event, timestamp: Date.now() });
      },
    );

    const logSub = emitter.addListener('onUsbLog', (event: { message: string }) => {
      if (event.message.startsWith('DIAG ')) {
        appendLog(event.message);
      }
    });

    return () => {
      diagnosticSub.remove();
      logSub.remove();
    };
  }, [appendLog]);

  return { enabled, lastSnapshot, recentLogs, setEnabled, clearLogs };
}
