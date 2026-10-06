/**
 * Fase 1 gate: confirma que `transform-remove-console` (babel.config.js) de
 * verdad quita console.log/info/debug del bundle de producción. Empaqueta con
 * `--dev false` (mismo modo que usa el APK de release) y falla si encuentra
 * "console.log(" / "console.info(" / "console.debug(" en el bundle resultante.
 * `console.error`/`console.warn` SÍ deben seguir — quedan excluidos a propósito
 * (ver babel.config.js, exclude: ['error', 'warn']) para diagnóstico de campo.
 *
 * Uso: node scripts/perf/check-release-console.js [--platform android|ios]
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) {
    return fallback;
  }
  return process.argv[idx + 1];
}

const platform = argValue('--platform', 'android');
const bundleOutput = path.join(
  os.tmpdir(),
  `midaz-atlas-release-check.${platform}.bundle`,
);
const sourcemapOutput = `${bundleOutput}.map`;

console.log(`[check-release-console] bundling (--dev false, platform=${platform})...`);

// Llamar cli.js directo con el propio node (no el wrapper .cmd de .bin/):
// spawnSync con un .cmd en Windows puede tirar EINVAL según la versión de Node.
const reactNativeCli = path.join(projectRoot, 'node_modules', 'react-native', 'cli.js');

const result = spawnSync(
  process.execPath,
  [
    reactNativeCli,
    'bundle',
    '--platform',
    platform,
    '--dev',
    'false',
    '--entry-file',
    'index.js',
    '--bundle-output',
    bundleOutput,
    '--sourcemap-output',
    sourcemapOutput,
    '--reset-cache',
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, STORYBOOK_ENABLED: 'false' },
  },
);

if (result.error) {
  console.error('[check-release-console] failed to spawn react-native CLI:', result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('[check-release-console] bundling failed');
  process.exit(result.status ?? 1);
}

const bundleText = fs.readFileSync(bundleOutput, 'utf8');

// Excluidos a propósito (ver exclude:['error','warn'] en babel.config.js).
const forbidden = ['console.log(', 'console.info(', 'console.debug('];
const findings = forbidden
  .map((needle) => ({ needle, count: bundleText.split(needle).length - 1 }))
  .filter((entry) => entry.count > 0);

fs.rmSync(bundleOutput, { force: true });
fs.rmSync(sourcemapOutput, { force: true });

if (findings.length > 0) {
  console.error('[check-release-console] FAIL — el bundle de release todavía tiene logs vivos:');
  for (const { needle, count } of findings) {
    console.error(`  ${needle} × ${count}`);
  }
  console.error(
    'Revisa que NODE_ENV/BABEL_ENV sea production al invocar el bundler, y que ' +
      "babel.config.js incluya transform-remove-console solo cuando api.env('production').",
  );
  process.exit(1);
}

console.log('[check-release-console] OK — sin console.log/info/debug en el bundle de release.');
