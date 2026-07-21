import { checkFiscalHealth, resetFiscalClientForTests } from '../index';

jest.mock('@shared/config/fiscal', () => ({
  shouldUseMockFiscal: () => true,
  getFiscalServiceBaseUrl: () => 'http://127.0.0.1:8765',
}));

describe('checkFiscalHealth (mock)', () => {
  beforeEach(() => {
    resetFiscalClientForTests();
  });

  it('returns mock healthy envelope without fetch', () => {
    const envelope = checkFiscalHealth();

    return expect(envelope).resolves.toMatchObject({
      success: true,
      data: {
        healthy: true,
        serviceRunning: true,
        usbConnected: true,
        printerReady: true,
      },
    });
  });
});
