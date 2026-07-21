/**
 * Prepares a physical Android device to reach Metro on the dev machine (USB or Wi‑Fi adb).
 */
const { execSync } = require('child_process');

const { getLanHost } = require('./getLanHost');

const port = process.env.RCT_METRO_PORT || '8081';
const host = getLanHost();

function run(cmd) {
  // eslint-disable-next-line no-console
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

try {
  run(`adb reverse tcp:${port} tcp:${port}`);
  // eslint-disable-next-line no-console
  console.log(
    `\nMetro: adb reverse active (device localhost:${port} → PC).` +
      `\nIf images still fail over Wi‑Fi, set Dev menu → Debug server host → ${host}:${port}` +
      `\nPC LAN IP: ${host}\n`,
  );
} catch {
  // eslint-disable-next-line no-console
  console.warn(
    `\nadb reverse failed. On a wireless kiosk, open Dev menu (shake device) and set:\n` +
      `  Debug server host = ${host}:${port}\n` +
      `Ensure Metro runs with: npm run start  (uses your LAN IP ${host})\n`,
  );
}
