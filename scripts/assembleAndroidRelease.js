/**
 * Builds release APK only (no adb install). Prefer this over `run-android --mode release`
 * when ADB/wireless is flaky or the terminal keeps cancelling long installs.
 *
 * Env:
 *   REACT_NATIVE_ARCHITECTURES — default armeabi-v7a,arm64-v8a (kiosk devices).
 *   ANDROID_HOME / ANDROID_SDK_ROOT — resolved from LOCALAPPDATA if unset.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const androidDir = path.join(__dirname, '..', 'android');
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

function resolveAndroidSdk() {
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    return process.env.ANDROID_HOME;
  }
  if (process.env.ANDROID_SDK_ROOT && fs.existsSync(process.env.ANDROID_SDK_ROOT)) {
    return process.env.ANDROID_SDK_ROOT;
  }
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidate = path.join(local, 'Android', 'Sdk');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

const sdk = resolveAndroidSdk();
if (!sdk) {
  console.error(
    'Android SDK not found. Set ANDROID_HOME or install SDK under %LOCALAPPDATA%\\Android\\Sdk',
  );
  process.exit(1);
}

process.env.ANDROID_HOME = sdk;
process.env.ANDROID_SDK_ROOT = sdk;
process.env.STORYBOOK_ENABLED = process.env.STORYBOOK_ENABLED || 'false';

const architectures =
  process.env.REACT_NATIVE_ARCHITECTURES ||
  process.env.ORG_GRADLE_PROJECT_reactNativeArchitectures ||
  'armeabi-v7a,arm64-v8a';

const apkPath = path.join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);

console.log(`[android:release:apk] SDK=${sdk}`);
console.log(`[android:release:apk] ABIs=${architectures}`);
console.log('[android:release:apk] Starting assembleRelease (this can take several minutes)...\n');

const started = Date.now();
const result = spawnSync(
  gradlew,
  [
    'assembleRelease',
    `--project-prop`,
    `reactNativeArchitectures=${architectures}`,
    '--build-cache',
    '--parallel',
  ],
  {
    cwd: androidDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  },
);

const minutes = ((Date.now() - started) / 60000).toFixed(1);

if (result.status !== 0) {
  console.error(`\n[android:release:apk] FAILED after ${minutes} min (exit ${result.status ?? 1})`);
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(apkPath)) {
  console.error(`\n[android:release:apk] Build OK but APK missing: ${apkPath}`);
  process.exit(1);
}

console.log(`\n[android:release:apk] OK in ${minutes} min`);
console.log(`Release APK: ${apkPath}\n`);
console.log('Install with: npm run android:release:install');
console.log(`Or: adb install -r "${apkPath}"\n`);
