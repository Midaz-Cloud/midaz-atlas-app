import { NativeModules } from 'react-native';

import { shouldUseMockApi } from '@shared/config/api';

import type { EcrClient, EcrPaymentResult } from './EcrClient';
import { formatEcrDocumentNumber } from './formatEcrDocumentNumber';
import { MockEcrClient } from './MockEcrClient';

type UsbSerialModuleType = {
  initialize(): Promise<void>;
  requestUsbPermission(): Promise<void>;
  close(): Promise<void>;
  sendLine(line: string): Promise<void>;
};

const { UsbSerialModule } = NativeModules as {
  UsbSerialModule?: UsbSerialModuleType;
};

/**
 * Wraps UsbSerialModule when present; falls back to MockEcrClient in demo or missing native code.
 */
export class NativeEcrClient implements EcrClient {
  private readonly fallback = new MockEcrClient();
  private useNative: boolean;

  constructor() {
    this.useNative = !shouldUseMockApi() && UsbSerialModule != null;
    if (!shouldUseMockApi() && UsbSerialModule == null && __DEV__) {
      console.warn('[ECR] UsbSerialModule not found — using MockEcrClient');
    }
  }

  private get native(): UsbSerialModuleType | null {
    return this.useNative ? UsbSerialModule ?? null : null;
  }

  async initialize(): Promise<void> {
    if (this.native) {
      await this.native.initialize();
      return;
    }
    await this.fallback.initialize();
  }

  async connect(_deviceName?: string): Promise<void> {
    if (this.native) {
      await this.native.initialize();
      await this.native.requestUsbPermission();
      return;
    }
    await this.fallback.connect();
  }

  async disconnect(): Promise<void> {
    if (this.native) {
      await this.native.close();
      return;
    }
    await this.fallback.disconnect();
  }

  async checkConnection(): Promise<boolean> {
    return this.fallback.checkConnection();
  }

  async performPayment(documentNumber: string, amount: number): Promise<EcrPaymentResult> {
    if (this.native) {
      const doc = formatEcrDocumentNumber(documentNumber);
      const payload = JSON.stringify({
        type: 'payment',
        documentNumber: doc,
        amount,
        waiterNum: '01',
        transType: 0,
        referenceNo: `REF-${Date.now()}`,
        timestamp: Date.now(),
      });
      await this.native.sendLine(payload);
      return { success: true, rawResponse: payload };
    }
    return this.fallback.performPayment(documentNumber, amount);
  }

  async performSettlement(): Promise<string> {
    if (this.native) {
      const payload = JSON.stringify({ type: 'settlement' });
      await this.native.sendLine(payload);
      return payload;
    }
    return this.fallback.performSettlement();
  }

  async forceCleanup(): Promise<void> {
    if (this.native) {
      await this.native.close();
      return;
    }
    await this.fallback.forceCleanup();
  }
}
