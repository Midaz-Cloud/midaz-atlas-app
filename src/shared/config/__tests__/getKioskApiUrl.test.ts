import { getKioskApiUrl } from '../api';

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    KIOSK_API_BASE_URL: 'http://10.182.5.13:3000',
  },
}));

describe('getKioskApiUrl', () => {
  it('builds URLs without /api prefix', () => {
    expect(getKioskApiUrl('/auth/kiosk/login')).toBe(
      'http://10.182.5.13:3000/auth/kiosk/login',
    );
    expect(getKioskApiUrl('kiosk/config')).toBe('http://10.182.5.13:3000/kiosk/config');
  });
});
