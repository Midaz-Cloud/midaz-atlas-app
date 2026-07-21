import { buildDigitalTicketQrValue } from '@shared/kiosk-order/buildDigitalTicketQrValue';

import { MockPrinterClient } from '../MockPrinterClient';
import { printOrderTicket } from '../printOrderTicket';

jest.mock('../createPrinterClient', () => ({
  createPrinterClient: jest.fn(() => new MockPrinterClient()),
}));

describe('printOrderTicket', () => {
  it('passes tracking QR to printer when printQrEnabled is true', async () => {
    const printSpy = jest.spyOn(MockPrinterClient.prototype, 'printText');

    await printOrderTicket({
      displayOrderNumber: 'ORD-99',
      lines: [],
      totals: {
        subtotalUsd: 1,
        taxUsd: 0,
        totalUsd: 1,
        subtotalVes: 100,
        taxVes: 0,
        totalVes: 100,
      },
      usdToVesRate: 100,
      printQrEnabled: true,
      trackShortCode: 'ABC1',
    });

    expect(printSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      buildDigitalTicketQrValue('ABC1'),
    );

    printSpy.mockRestore();
  });

  it('omits QR when printQrEnabled is false', async () => {
    const printSpy = jest.spyOn(MockPrinterClient.prototype, 'printText');

    await printOrderTicket({
      displayOrderNumber: 'ORD-99',
      lines: [],
      totals: {
        subtotalUsd: 1,
        taxUsd: 0,
        totalUsd: 1,
        subtotalVes: 100,
        taxVes: 0,
        totalVes: 100,
      },
      usdToVesRate: 100,
      printQrEnabled: false,
    });

    expect(printSpy).toHaveBeenCalledWith(expect.any(String), expect.any(String), undefined);

    printSpy.mockRestore();
  });

  it('omits QR when trackShortCode is missing even if printQrEnabled is true', async () => {
    const printSpy = jest.spyOn(MockPrinterClient.prototype, 'printText');

    await printOrderTicket({
      displayOrderNumber: 'ORD-99',
      lines: [],
      totals: {
        subtotalUsd: 1,
        taxUsd: 0,
        totalUsd: 1,
        subtotalVes: 100,
        taxVes: 0,
        totalVes: 100,
      },
      usdToVesRate: 100,
      printQrEnabled: true,
      trackShortCode: null,
    });

    expect(printSpy).toHaveBeenCalledWith(expect.any(String), expect.any(String), undefined);

    printSpy.mockRestore();
  });
});
