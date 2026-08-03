jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@op-engineering/op-sqlite', () => {
  const failedRows = [];
  const posSuccessRows = [];
  let nextFailedId = 1;
  let nextPosId = 1;
  return {
    open: () => ({
      execute: async (query, params = []) => {
        const sql = String(query).replace(/\s+/g, ' ').trim().toUpperCase();
        if (sql.startsWith('CREATE')) {
          return { rows: [], rowsAffected: 0 };
        }
        if (sql.startsWith('INSERT INTO FAILED_PAYMENTS')) {
          const id = nextFailedId++;
          failedRows.push({
            id,
            created_at: params[0],
            display_ref: params[1],
            stage: params[2],
            payment_method: params[3],
            error_reason: params[4],
            error_message: params[5],
            customer_json: params[6],
            order_json: params[7],
            payment_json: params[8],
            raw_json: params[9],
          });
          return { insertId: id, rows: [], rowsAffected: 1 };
        }
        if (sql.startsWith('UPDATE FAILED_PAYMENTS SET DISPLAY_REF')) {
          const row = failedRows.find((r) => r.id === params[1]);
          if (row) {
            row.display_ref = params[0];
          }
          return { rows: [], rowsAffected: row ? 1 : 0 };
        }
        if (sql.startsWith('DELETE FROM FAILED_PAYMENTS')) {
          const keep = Number(params[0] ?? 200);
          failedRows.sort((a, b) => b.id - a.id);
          failedRows.splice(keep);
          return { rows: [], rowsAffected: 0 };
        }
        if (sql.includes('FROM FAILED_PAYMENTS WHERE ID')) {
          const row = failedRows.find((r) => r.id === params[0]);
          return { rows: row ? [row] : [], rowsAffected: 0 };
        }
        if (sql.includes('FROM FAILED_PAYMENTS')) {
          return {
            rows: [...failedRows].sort((a, b) => b.id - a.id),
            rowsAffected: 0,
          };
        }
        if (sql.startsWith('INSERT INTO POS_SUCCESSFUL_TRANSACTIONS')) {
          const id = nextPosId++;
          posSuccessRows.push({
            id,
            created_at: params[0],
            pos_reference: params[1],
            rrn: params[2],
            trace_number: params[3],
            amount: params[4],
            amount_display: params[5],
            device_serial: params[6],
            batch_num: params[7],
            card_type: params[8],
            raw_json: params[9],
            pos_date_time: params[10],
          });
          return { insertId: id, rows: [], rowsAffected: 1 };
        }
        if (sql === 'DELETE FROM POS_SUCCESSFUL_TRANSACTIONS;') {
          const count = posSuccessRows.length;
          posSuccessRows.length = 0;
          return { rows: [], rowsAffected: count };
        }
        if (sql.includes('FROM POS_SUCCESSFUL_TRANSACTIONS')) {
          return {
            rows: [...posSuccessRows].sort((a, b) => a.id - b.id),
            rowsAffected: 0,
          };
        }
        return { rows: [], rowsAffected: 0 };
      },
    }),
  };
});

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
