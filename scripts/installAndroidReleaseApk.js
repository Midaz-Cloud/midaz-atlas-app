/**
 * Installs the last assembleRelease APK via adb (-r replace).
 * Does not rebuild — run `npm run android:release:apk` first.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const apkPath = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);

function resolveAdb() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv) {
    const candidate = path.join(fromEnv, 'platform-tools', 'adb.exe');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidate = path.join(local, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return 'adb';
}

if (!fs.existsSync(apkPath)) {
  console.error(`APK not found: ${apkPath}`);
  console.error('Build first: npm run android:release:apk');
  process.exit(1);
}

const cliDevice =
  process.argv.find((a, i, arr) => arr[i - 1] === '--device') ||
  process.argv.find(a => a.startsWith('--device='))?.slice('--device='.length) ||
  null;

/** CLI `--device` wins over leftover ANDROID_SERIAL from a previous session. */
const serial =
  cliDevice || process.env.ANDROID_SERIAL || process.env.ADB_SERIAL || null;

const adb = resolveAdb();
console.log(`[android:release:install] adb=${adb}`);
console.log(`[android:release:install] apk=${apkPath}`);
if (serial) {
  console.log(`[android:release:install] device=${serial}`);
}

function adbArgs(...args) {
  return serial ? ['-s', serial, ...args] : args;
}

function listDevices() {
  return spawnSync(adb, ['devices'], { encoding: 'utf8', shell: false });
}

let devices = listDevices();
const daemonBroken =
  devices.status !== 0 ||
  /failed to start daemon|cannot connect to daemon|could not read ok/i.test(
    `${devices.stdout || ''}${devices.stderr || ''}`,
  );

if (daemonBroken) {
  console.warn(
    '[android:release:install] ADB daemon stuck — killing adb.exe and restarting...',
  );
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/F', '/IM', 'adb.exe'], {
      encoding: 'utf8',
      shell: false,
    });
  } else {
    spawnSync(adb, ['kill-server'], { encoding: 'utf8', shell: false });
  }
  spawnSync(adb, ['start-server'], { encoding: 'utf8', shell: false });
  devices = listDevices();
}

console.log(devices.stdout || devices.stderr || '');
if (devices.status !== 0) {
  console.error(
    'adb devices failed — close Android Studio if open, run: taskkill /F /IM adb.exe && adb start-server',
  );
  process.exit(devices.status ?? 1);
}

const lines = String(devices.stdout || '')
  .split(/\r?\n/)
  .filter(l => /\tdevice$/.test(l));
if (lines.length === 0) {
  console.error('No device in "device" state. Connect USB/Wi‑Fi debugging and retry.');
  process.exit(1);
}

if (serial) {
  const match = lines.some(l => l.startsWith(`${serial}\t`));
  if (!match) {
    console.error(`Device not found or not ready: ${serial}`);
    console.error('Connected:', lines.map(l => l.split('\t')[0]).join(', '));
    process.exit(1);
  }
} else if (lines.length > 1) {
  console.error(
    'Several devices connected. Pick one:\n' +
      `  $env:ANDROID_SERIAL="10.182.3.88:42491"; npm run android:release:install\n` +
      `  npm run android:release:install -- --device 10.182.3.88:42491`,
  );
  process.exit(1);
}

const result = spawnSync(adb, adbArgs('install', '-r', apkPath), {
  stdio: 'inherit',
  shell: false,
});
process.exit(result.status ?? 1);
