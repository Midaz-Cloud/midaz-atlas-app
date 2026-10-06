module.exports = function (api) {
  const isProd = api.env('production');
  // Solo depende de si es build de producción: el resultado no cambia por nada más.
  api.cache.using(() => isProd);

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@assets': './assets',
            '@modules': './src/modules',
            '@shared': './src/shared',
          },
        },
      ],
      // Solo en release: quita console.log/info/debug (deja error/warn) —
      // elimina también la evaluación de los argumentos (JSON.stringify,
      // spreads de objetos grandes), no solo la llamada. Ver docs/... y
      // KIOSK_VERBOSE_LOGS para diagnósticos de campo sin recompilar debug.
      ...(isProd ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
      // react-native-reanimated/plugin tiene que ir último.
      'react-native-reanimated/plugin',
    ],
  };
};
