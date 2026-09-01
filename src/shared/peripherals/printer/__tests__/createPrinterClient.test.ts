import { resetPrinterClientForTests } from '../createPrinterClient';
import { MockPrinterClient } from '../MockPrinterClient';

jest.mock('@shared/config', () => ({
  shouldUsePrinterHardware: jest.fn(() => false),
}));

describe('createPrinterClient', () => {
  afterEach(() => {
    resetPrinterClientForTests();
    jest.resetModules();
  });

  it('uses mock client when hardware is disabled', () => {
    jest.isolateModules(() => {
      const { createPrinterClient } = require('../createPrinterClient');
      const { MockPrinterClient: IsolatedMockPrinterClient } = require('../MockPrinterClient');
      const client = createPrinterClient();
      expect(client).toBeInstanceOf(IsolatedMockPrinterClient);
    });
  });
});
