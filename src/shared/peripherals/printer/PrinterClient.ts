export type PrinterClient = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  printText(text: string, merchantName?: string, qrValue?: string): Promise<void>;
};
