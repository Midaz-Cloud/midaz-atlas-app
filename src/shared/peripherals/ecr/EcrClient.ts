export type EcrPaymentResult = {
  success: boolean;
  rawResponse: string;
};

export interface EcrClient {
  initialize(): Promise<void>;
  connect(deviceName?: string): Promise<void>;
  disconnect(): Promise<void>;
  checkConnection(): Promise<boolean>;
  performPayment(documentNumber: string, amount: number): Promise<EcrPaymentResult>;
  performSettlement(): Promise<string>;
  forceCleanup(): Promise<void>;
}
