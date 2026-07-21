const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { resolve: metroResolve } = require('metro-resolver');
const { withStorybook } = require('@storybook/react-native/withStorybook');

const projectRoot = __dirname;

/** Path aliases (must match babel.config.js + tsconfig paths). */
const ALIASES = {
  '@assets': path.resolve(projectRoot, 'assets'),
  '@modules': path.resolve(projectRoot, 'src/modules'),
  '@shared': path.resolve(projectRoot, 'src/shared'),
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * When STORYBOOK_ENABLED=true, entry point swaps to `.rnstorybook`.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(projectRoot);

defaultConfig.transformer = {
  ...defaultConfig.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/react-native'),
};

defaultConfig.resolver = {
  ...defaultConfig.resolver,
  assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
};

const reanimatedRoot = path.dirname(
  require.resolve('react-native-reanimated/package.json'),
);
const reanimatedEntry = path.join(reanimatedRoot, 'lib/module/index.js');

/** Delegate to Metro default resolver (never call context.resolveRequest — avoids stack overflow). */
function resolveWithMetro(context, moduleName, platform) {
  return metroResolve(
    { ...context, resolveRequest: metroResolve },
    moduleName,
    platform,
  );
}

function toProjectRelativeSpecifier(filePath) {
  const relative = path.relative(projectRoot, path.resolve(filePath)).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function resolveAlias(context, moduleName, platform) {
  for (const [alias, aliasRoot] of Object.entries(ALIASES)) {
    if (moduleName === alias || moduleName.startsWith(`${alias}/`)) {
      const subpath = moduleName === alias ? '' : moduleName.slice(alias.length + 1);
      const candidate = path.resolve(aliasRoot, subpath);
      if (!fs.existsSync(candidate)) {
        continue;
      }
      return resolveWithMetro(context, toProjectRelativeSpecifier(candidate), platform);
    }
  }
  return null;
}

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated') {
    return {
      filePath: reanimatedEntry,
      type: 'sourceFile',
    };
  }

  const aliasResolution = resolveAlias(context, moduleName, platform);
  if (aliasResolution) {
    return aliasResolution;
  }

  return resolveWithMetro(context, moduleName, platform);
};

module.exports = withStorybook(mergeConfig(defaultConfig, {}));
