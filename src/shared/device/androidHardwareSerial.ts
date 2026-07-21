import { NativeModules, Platform } from 'react-native';

type KioskDeviceNativeModule = {
  getHardwareSerial: () => Promise<string>;
};

function getNativeModule(): KioskDeviceNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  const mod = (NativeModules as { KioskDeviceModule?: KioskDeviceNativeModule })
    .KioskDeviceModule;
  if (!mod?.getHardwareSerial) {
    return null;
  }
  return mod;
}

/** ro.serialno / ro.boot.serialno from native (works when DeviceInfo returns unknown). */
export async function getAndroidHardwareSerial(): Promise<string | null> {
  const mod = getNativeModule();
  if (!mod) {
    return null;
  }
  try {
    const serial = (await mod.getHardwareSerial()).trim();
    if (!serial || serial.toLowerCase() === 'unknown') {
      return null;
    }
    return serial;
  } catch {
    return null;
  }
}
