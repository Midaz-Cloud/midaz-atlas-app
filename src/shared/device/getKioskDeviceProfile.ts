import { PermissionsAndroid, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {
  getKioskDeviceSerialOverride,
  KIOSK_DEMO_SERIAL,
  shouldUseMockApi,
} from '@shared/config';

import { getAndroidHardwareSerial } from './androidHardwareSerial';
import type { KioskDeviceProfile } from './types';

function isValidHardwareSerial(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed.toLowerCase() !== 'unknown');
}

function resolveSerial(raw: string): string {
  const override = getKioskDeviceSerialOverride();
  if (override) {
    return override;
  }
  if (isValidHardwareSerial(raw)) {
    return raw.trim();
  }
  if (shouldUseMockApi()) {
    return KIOSK_DEMO_SERIAL;
  }
  return raw.trim() || 'unknown';
}

async function ensurePhoneStatePermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 23) {
    return;
  }
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    );
    if (granted) {
      return;
    }
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
  } catch {
    // Best-effort; native ro.serialno fallback still applies.
  }
}

async function readHardwareSerial(): Promise<string> {
  const fromNative = await getAndroidHardwareSerial();
  if (isValidHardwareSerial(fromNative)) {
    return fromNative.trim();
  }

  await ensurePhoneStatePermission();
  const fromDeviceInfo = await DeviceInfo.getSerialNumber();
  if (isValidHardwareSerial(fromDeviceInfo)) {
    return fromDeviceInfo.trim();
  }

  return '';
}

export async function getKioskDeviceProfile(): Promise<KioskDeviceProfile> {
  const hardwareSerial = await readHardwareSerial();
  const [uniqueId, brand, model, systemVersion, appVersion, buildNumber] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.getBrand(),
    DeviceInfo.getModel(),
    DeviceInfo.getSystemVersion(),
    DeviceInfo.getVersion(),
    DeviceInfo.getBuildNumber(),
  ]);

  return {
    serialNumber: resolveSerial(hardwareSerial),
    hardwareSerial,
    uniqueId,
    brand,
    model,
    systemVersion,
    appVersion,
    buildNumber,
  };
}
