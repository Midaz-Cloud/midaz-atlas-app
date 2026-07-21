import Config from 'react-native-config';

import { shouldUseMockApi } from '../api';

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../env', () => ({
  isKioskDemoMode: false,
  parseBooleanEnv: (value: string | undefined) => value === 'true',
  getEnvString: () => undefined,
}));

describe('shouldUseMockApi', () => {
  beforeEach(() => {
    (Config as { KIOSK_API_USE_MOCK?: string }).KIOSK_API_USE_MOCK = 'false';
    const env = jest.requireMock('../env') as { isKioskDemoMode: boolean };
    env.isKioskDemoMode = false;
  });

  it('returns false in demo mode when KIOSK_API_USE_MOCK is false', () => {
    const env = jest.requireMock('../env') as { isKioskDemoMode: boolean };
    env.isKioskDemoMode = true;
    (Config as { KIOSK_API_USE_MOCK?: string }).KIOSK_API_USE_MOCK = 'false';
    expect(shouldUseMockApi()).toBe(false);
  });

  it('returns true only when KIOSK_API_USE_MOCK is literal true', () => {
    (Config as { KIOSK_API_USE_MOCK?: string }).KIOSK_API_USE_MOCK = 'true';
    expect(shouldUseMockApi()).toBe(true);
  });

  it('returns false when mock flag is false and not in demo', () => {
    (Config as { KIOSK_API_USE_MOCK?: string }).KIOSK_API_USE_MOCK = 'false';
    expect(shouldUseMockApi()).toBe(false);
  });
});
