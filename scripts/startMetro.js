/**
 * Starts Metro bound to the LAN interface so physical devices on Wi‑Fi can load assets.
 */
const { spawn } = require('child_process');

const { getLanHost } = require('./getLanHost');

const host = getLanHost();
const port = process.env.RCT_METRO_PORT || '8081';
const extraArgs = process.argv.slice(2);

const env = {
  ...process.env,
  STORYBOOK_ENABLED: 'false',
  REACT_NATIVE_PACKAGER_HOSTNAME: host,
};

// eslint-disable-next-line no-console
console.log(`Starting Metro at ${host}:${port} (STORYBOOK_ENABLED=false)\n`);

const child = spawn(
  'npx',
  ['react-native', 'start', '--host', host, '--port', String(port), ...extraArgs],
  { stdio: 'inherit', shell: true, env },
);

child.on('exit', (code) => process.exit(code ?? 0));
