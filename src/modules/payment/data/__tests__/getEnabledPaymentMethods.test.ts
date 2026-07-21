import { getEnabledPaymentMethods } from '../getEnabledPaymentMethods';
import { mockPagoMovilAccount } from '@shared/api/kiosk/mock/mockPagoMovilAccount';

jest.mock('@shared/config/api', () => ({
  shouldUseMockApi: jest.fn(),
}));

import { shouldUseMockApi } from '@shared/config/api';

const mockShouldUseMockApi = shouldUseMockApi as jest.MockedFunction<typeof shouldUseMockApi>;

describe('getEnabledPaymentMethods', () => {
  beforeEach(() => {
    mockShouldUseMockApi.mockReset();
  });

  it('hides mobile on live API when pago_movil is enabled but account is missing', () => {
    mockShouldUseMockApi.mockReturnValue(false);
    const methods = getEnabledPaymentMethods(['debito', 'pago_movil'], {
      pagoMovilAccount: null,
    });
    expect(methods.map((m) => m.id)).toEqual(['pos']);
  });

  it('shows mobile on live API when account is configured', () => {
    mockShouldUseMockApi.mockReturnValue(false);
    const methods = getEnabledPaymentMethods(['debito', 'pago_movil'], {
      pagoMovilAccount: mockPagoMovilAccount,
    });
    expect(methods.map((m) => m.id)).toEqual(['pos', 'mobile']);
  });

  it('shows mobile in mock mode even without account in config', () => {
    mockShouldUseMockApi.mockReturnValue(true);
    const methods = getEnabledPaymentMethods(['pago_movil'], {
      pagoMovilAccount: null,
    });
    expect(methods.map((m) => m.id)).toContain('mobile');
  });

  it('shows cash when efectivo_ves is enabled', () => {
    mockShouldUseMockApi.mockReturnValue(false);
    const methods = getEnabledPaymentMethods(['debito', 'efectivo_ves'], {
      pagoMovilAccount: null,
    });
    expect(methods.map((m) => m.id)).toEqual(['pos', 'cash']);
  });

  it('shows cash when legacy efectivo is enabled', () => {
    mockShouldUseMockApi.mockReturnValue(false);
    const methods = getEnabledPaymentMethods(['debito', 'efectivo'], {
      pagoMovilAccount: null,
    });
    expect(methods.map((m) => m.id)).toEqual(['pos', 'cash']);
  });
});
