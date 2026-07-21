import DeviceInfo from 'react-native-device-info';

import { getKioskDeviceProfile } from '../getKioskDeviceProfile';

jest.mock('../androidHardwareSerial', () => ({
  getAndroidHardwareSerial: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-device-info', () => ({
  getSerialNumber: jest.fn().mockResolvedValue('HW-SERIAL-123'),
  getUniqueId: jest.fn().mockResolvedValue('unique-id'),
  getBrand: jest.fn().mockResolvedValue('Brand'),
  getModel: jest.fn().mockResolvedValue('Model'),
  getSystemVersion: jest.fn().mockResolvedValue('14'),
  getVersion: jest.fn().mockResolvedValue('1.0.0'),
  getBuildNumber: jest.fn().mockResolvedValue('1'),
}));

jest.mock('@shared/config/api', () => ({
  getKioskDeviceSerialOverride: jest.fn(() => undefined),
  shouldUseMockApi: jest.fn(() => false),
  KIOSK_DEMO_SERIAL: 'AF910-DEMO-001',
}));

const { getAndroidHardwareSerial } = jest.requireMock('../androidHardwareSerial') as {
  getAndroidHardwareSerial: jest.Mock;
};

describe('getKioskDeviceProfile', () => {
  beforeEach(() => {
    getAndroidHardwareSerial.mockResolvedValue(null);
    const api = jest.requireMock('@shared/config/api') as {
      getKioskDeviceSerialOverride: jest.Mock;
      shouldUseMockApi: jest.Mock;
    };
    api.getKioskDeviceSerialOverride.mockReturnValue(undefined);
    api.shouldUseMockApi.mockReturnValue(false);
    (DeviceInfo.getSerialNumber as jest.Mock).mockResolvedValue('HW-SERIAL-123');
  });

  it('returns hardware serial when available from DeviceInfo', async () => {
    const profile = await getKioskDeviceProfile();
    expect(profile.serialNumber).toBe('HW-SERIAL-123');
    expect(profile.hardwareSerial).toBe('HW-SERIAL-123');
  });

  it('prefers native android serial over DeviceInfo', async () => {
    getAndroidHardwareSerial.mockResolvedValue('EF60D150169');
    const profile = await getKioskDeviceProfile();
    expect(profile.serialNumber).toBe('EF60D150169');
    expect(profile.hardwareSerial).toBe('EF60D150169');
  });

  it('uses serial override when set', async () => {
    const api = jest.requireMock('@shared/config/api') as {
      getKioskDeviceSerialOverride: jest.Mock;
    };
    api.getKioskDeviceSerialOverride.mockReturnValue('AF910-OVERRIDE');
    const profile = await getKioskDeviceProfile();
    expect(profile.serialNumber).toBe('AF910-OVERRIDE');
    expect(profile.hardwareSerial).toBe('HW-SERIAL-123');
  });

  it('does not use demo serial in live mode when hardware is unknown', async () => {
    getAndroidHardwareSerial.mockResolvedValue(null);
    (DeviceInfo.getSerialNumber as jest.Mock).mockResolvedValue('unknown');
    const profile = await getKioskDeviceProfile();
    expect(profile.serialNumber).toBe('unknown');
    expect(profile.hardwareSerial).toBe('');
  });

  it('uses demo serial only when mock API is enabled and hardware is unknown', async () => {
    const api = jest.requireMock('@shared/config/api') as {
      shouldUseMockApi: jest.Mock;
    };
    api.shouldUseMockApi.mockReturnValue(true);
    getAndroidHardwareSerial.mockResolvedValue(null);
    (DeviceInfo.getSerialNumber as jest.Mock).mockResolvedValue('unknown');
    const profile = await getKioskDeviceProfile();
    expect(profile.serialNumber).toBe('AF910-DEMO-001');
  });
});
