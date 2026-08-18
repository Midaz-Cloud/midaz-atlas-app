import { getKioskTrackBaseUrl } from '../api';

const mockGetEnvString = jest.fn();

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../env', () => ({
  isKioskDemoMode: false,
  parseBooleanEnv: (value: string | undefined) => value === 'true',
  getEnvString: (key: string) => mockGetEnvString(key),
}));

const PLACEHOLDER_DEFAULT = 'http://localhost:8001';

describe('getKioskTrackBaseUrl', () => {
  beforeEach(() => {
    mockGetEnvString.mockReset();
  });

  it('uses the localhost placeholder when KIOSK_TRACK_BASE_URL is unset', () => {
    mockGetEnvString.mockReturnValue(undefined);
    expect(getKioskTrackBaseUrl()).toBe(PLACEHOLDER_DEFAULT);
  });

  it('returns the configured origin without a trailing slash', () => {
    mockGetEnvString.mockReturnValue('http://localhost:8001/');
    expect(getKioskTrackBaseUrl()).toBe('http://localhost:8001');
  });

  it('strips an accidental /track suffix so callers can append /track/{code}', () => {
    mockGetEnvString.mockReturnValue('http://localhost:8001/track/');
    expect(getKioskTrackBaseUrl()).toBe('http://localhost:8001');
  });
});
