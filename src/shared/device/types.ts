export type KioskDeviceProfile = {
  /** Value used for login / config API (`serialNumber` in requests). */
  serialNumber: string;
  /** Raw hardware serial from `DeviceInfo.getSerialNumber()` (no .env override). */
  hardwareSerial: string;
  uniqueId: string;
  brand: string;
  model: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
};
