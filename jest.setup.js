jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockQrCode() {
    return React.createElement(View, { testID: 'mock-qrcode' });
  };
});

jest.mock('react-native-device-info', () => ({
  getSerialNumber: jest.fn(() => Promise.resolve('TEST-SERIAL')),
  getUniqueId: jest.fn(() => Promise.resolve('test-unique-id')),
  getBrand: jest.fn(() => Promise.resolve('TestBrand')),
  getModel: jest.fn(() => Promise.resolve('TestModel')),
  getSystemVersion: jest.fn(() => Promise.resolve('11')),
  getVersion: jest.fn(() => Promise.resolve('0.0.1')),
  getBuildNumber: jest.fn(() => Promise.resolve('1')),
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { CacheDir: '/tmp/cache' },
      isDir: jest.fn(async () => true),
      mkdir: jest.fn(async () => undefined),
      exists: jest.fn(async () => false),
      unlink: jest.fn(async () => undefined),
    },
    config: jest.fn(() => ({
      fetch: jest.fn(async () => ({
        path: () => '/tmp/cache/kiosk-images/mock.img',
      })),
    })),
  },
}));

jest.mock('@shared/session', () => {
  const React = require('react');
  return {
    KioskSessionProvider: ({ children }) => children,
    useKioskSession: () => ({
      status: 'ready',
      runtimeConfig: {
        orderTypeSelectionEnabled: true,
        enabledPaymentMethods: ['debito', 'pago_movil'],
      },
      bootstrapSnapshot: null,
      bootstrapPhase: null,
      orderType: undefined,
      setOrderType: jest.fn(),
      tableNumber: undefined,
      setTableNumber: jest.fn(),
      deviceSerial: 'AF910-DEMO-001',
      retryBootstrap: jest.fn(),
      authErrorMessage: null,
    }),
    useKioskBootstrap: () => ({
      status: 'ready',
      snapshot: null,
      runtimeConfig: {
        orderTypeSelectionEnabled: true,
        enabledPaymentMethods: ['debito', 'pago_movil'],
      },
      deviceSerial: 'AF910-DEMO-001',
      bootstrapPhase: null,
      retryBootstrap: jest.fn(),
      authErrorMessage: null,
    }),
    useKioskAppearance: () => null,
    useKioskOrganization: () => null,
    useKioskOperational: () => null,
    bootstrapKioskSession: jest.fn(),
  };
});
