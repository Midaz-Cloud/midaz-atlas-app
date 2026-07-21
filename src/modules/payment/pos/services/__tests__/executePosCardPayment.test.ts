import { shouldUseMockApi } from '@shared/config';

import { executePosCardPayment } from '../executePosCardPayment';

jest.mock('@shared/config', () => ({
  shouldUseMockApi: jest.fn(),
}));

jest.mock('@shared/peripherals/ecr', () => ({
  documentIdToEcrDocumentNumber: jest.fn(() => '1234567'),
  EcrDocumentNumberError: class EcrDocumentNumberError extends Error {},
  parseEcrPaymentResponse: jest.fn(() => ({ approved: true })),
  resolvePosChargeAmountVes: jest.fn((total: number) => total),
  toEcrTerminalAmount: jest.fn((ves: number) => Math.round(ves * 100)),
}));

const mockEcr = {
  isConnected: true,
  usesNativeUsb: true,
  connect: jest.fn().mockResolvedValue(undefined),
  performPayment: jest.fn().mockResolvedValue('{"status":"approved"}'),
};

describe('executePosCardPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(shouldUseMockApi).mockReturnValue(false);
    mockEcr.isConnected = true;
  });

  it('skips USB when mock API', async () => {
    jest.mocked(shouldUseMockApi).mockReturnValue(true);
    const result = await executePosCardPayment({
      ecr: mockEcr as never,
      documentId: 'V1234567',
      cartTotalVes: 50,
    });
    expect(result.ok).toBe(true);
    expect(mockEcr.performPayment).not.toHaveBeenCalled();
  });

  it('returns ok on approved payment', async () => {
    const result = await executePosCardPayment({
      ecr: mockEcr as never,
      documentId: 'V1234567',
      cartTotalVes: 50,
    });
    expect(result.ok).toBe(true);
    expect(mockEcr.performPayment).toHaveBeenCalledWith('1234567', 50);
  });

  it('returns not_connected when native USB stays disconnected', async () => {
    mockEcr.isConnected = false;
    const result = await executePosCardPayment({
      ecr: mockEcr as never,
      documentId: 'V1234567',
      cartTotalVes: 1,
    });
    expect(result).toEqual({
      ok: false,
      reason: 'not_connected',
      message: 'Terminal POS no conectado',
    });
  });
});
