import type { EcrClient, EcrPaymentResult } from './EcrClient';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockEcrClient implements EcrClient {
  private connected = false;

  async initialize(): Promise<void> {
    await delay(100);
  }

  async connect(_deviceName?: string): Promise<void> {
    await delay(150);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async checkConnection(): Promise<boolean> {
    return this.connected;
  }

  async performPayment(documentNumber: string, amount: number): Promise<EcrPaymentResult> {
    await delay(400);
    return {
      success: true,
      rawResponse: JSON.stringify({ type: 'payment', documentNumber, amount, status: 'approved' }),
    };
  }

  async performSettlement(): Promise<string> {
    await delay(300);
    return JSON.stringify({ type: 'settlement', status: 'ok' });
  }

  async forceCleanup(): Promise<void> {
    this.connected = false;
  }
}
