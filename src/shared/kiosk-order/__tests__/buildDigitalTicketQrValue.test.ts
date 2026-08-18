import { buildDigitalTicketQrValue } from '../buildDigitalTicketQrValue';

const mockGetKioskTrackBaseUrl = jest.fn();

jest.mock('@shared/config/api', () => ({
  getKioskTrackBaseUrl: () => mockGetKioskTrackBaseUrl(),
}));

describe('buildDigitalTicketQrValue', () => {
  beforeEach(() => {
    mockGetKioskTrackBaseUrl.mockReset();
    mockGetKioskTrackBaseUrl.mockReturnValue('http://localhost:8001');
  });

  it('builds {base}/track/{shortCode} without a double slash', () => {
    expect(buildDigitalTicketQrValue('JSGCHA')).toBe(
      'http://localhost:8001/track/JSGCHA',
    );
  });

  it('encodes the shortCode', () => {
    expect(buildDigitalTicketQrValue('AB C')).toBe(
      'http://localhost:8001/track/AB%20C',
    );
  });
});
