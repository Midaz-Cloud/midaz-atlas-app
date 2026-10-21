import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { stringifyWithCrc, verifyEcrCrc } from '../ecrIntegrity';
import { useUsbECR, type UseUsbECRReturn } from '../useUsbECR';

type Listener = (event: Record<string, unknown>) => void;
const mockListeners: Record<string, Listener[]> = {};
const mockSentLines: string[] = [];

const mockUsbModule = {
  initialize: jest.fn(() => Promise.resolve()),
  requestUsbPermission: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
  sendLine: jest.fn((line: string) => {
    mockSentLines.push(line);
    return Promise.resolve();
  }),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

jest.mock('@shared/config', () => ({ shouldUseMockApi: () => false }));
jest.mock('../usbSerialModule', () => ({ getUsbSerialModule: () => mockUsbModule }));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  class MockEmitter {
    addListener(event: string, cb: Listener) {
      (mockListeners[event] ??= []).push(cb);
      return {
        remove: () => {
          mockListeners[event] = (mockListeners[event] ?? []).filter((l) => l !== cb);
        },
      };
    }
  }
  return Object.setPrototypeOf({ NativeEventEmitter: MockEmitter }, actual);
});

/** Lo que entrega el nativo al recibir una línea de PKUSB (los dos eventos, como en el equipo). */
function receive(payload: string) {
  act(() => {
    (mockListeners.onUsbCommandReceived ?? []).forEach((l) => l({ type: 'payment', payload }));
    (mockListeners.onUsbLineReceived ?? []).forEach((l) => l({ line: payload }));
  });
}

let mounted: TestRenderer.ReactTestRenderer | null = null;

function mountHook(): { current: UseUsbECRReturn } {
  const ref = {} as { current: UseUsbECRReturn };
  function Harness() {
    ref.current = useUsbECR();
    return null;
  }
  act(() => {
    mounted = TestRenderer.create(<Harness />);
  });
  return ref;
}

function lastRequest(): Record<string, unknown> {
  return JSON.parse(mockSentLines[mockSentLines.length - 1]!);
}

const APPROVED_DATA = {
  responseCode: '00',
  responseMessage: 'APPROVED',
  amount: 4679916,
  traceNumber: '000266',
  RRN: '621319000266',
  authCode: '123456',
  success: true,
};

describe('useUsbECR — reenvío de respuestas dañadas', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSentLines.length = 0;
  });
  afterEach(() => {
    act(() => {
      mounted?.unmount();
    });
    mounted = null;
    jest.useRealTimers();
  });

  it('el pedido sale con crc válido', async () => {
    const ecr = mountHook();
    act(() => {
      void ecr.current.performPayment('V12345678', 10).catch(() => {});
    });
    await act(async () => {});
    expect(verifyEcrCrc(mockSentLines[0]!)).toBe('valid');
    expect(lastRequest().type).toBe('payment');
  });

  it('pide resend hasta recibir una copia íntegra, sin repetir el cobro', async () => {
    const ecr = mountHook();
    let result: string | undefined;
    act(() => {
      void ecr.current.performPayment('V12345678', 46799.16).then((r) => {
        result = r;
      });
    });
    await act(async () => {});
    const referenceNo = lastRequest().referenceNo as string;

    const good = stringifyWithCrc({
      success: true,
      type: 'payment',
      result: 0,
      referenceNo,
      data: APPROVED_DATA,
    });
    const damaged = good.replace('"amount":4679916', '"amou7nt":4679916');

    receive(damaged);
    expect(lastRequest()).toMatchObject({ type: 'resend', referenceNo });

    // Sigue pidiendo mientras lleguen copias dañadas.
    receive(damaged);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    receive(damaged);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    const resends = mockSentLines.filter((l) => l.includes('"type":"resend"'));
    expect(resends.length).toBeGreaterThanOrEqual(3);
    expect(mockSentLines.filter((l) => l.includes('"type":"payment"'))).toHaveLength(1);

    receive(good);
    await act(async () => {});
    expect(result).toBe(good);

    // Ya resuelto: no se piden más reenvíos.
    const count = mockSentLines.length;
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(mockSentLines).toHaveLength(count);
  });

  it('si nunca llega copia íntegra, usa la dañada al vencer la ventana', async () => {
    const ecr = mountHook();
    let result: string | undefined;
    act(() => {
      void ecr.current.performPayment('V12345678', 46799.16).then((r) => {
        result = r;
      });
    });
    await act(async () => {});
    const referenceNo = lastRequest().referenceNo as string;
    const damaged = stringifyWithCrc({
      success: true,
      type: 'payment',
      result: 0,
      referenceNo,
      data: APPROVED_DATA,
    }).replace('"traceNumber"', '"traceNumbr"');

    receive(damaged);
    act(() => {
      jest.advanceTimersByTime(45_000);
    });
    await act(async () => {});
    expect(result).toBe(damaged);
  });

  it('si PKUSB dice que el pedido llegó dañado (-94), lo reenvía igual', async () => {
    const ecr = mountHook();
    act(() => {
      void ecr.current.performPayment('V12345678', 10).catch(() => {});
    });
    await act(async () => {});
    const original = mockSentLines[0]!;
    const referenceNo = lastRequest().referenceNo as string;

    receive(stringifyWithCrc({ success: false, type: 'payment', error: 'x', result: -94, referenceNo }));
    expect(mockSentLines).toHaveLength(2);
    expect(mockSentLines[1]).toBe(original);
  });

  it('un -96 en un cobro no repite el pedido', async () => {
    const ecr = mountHook();
    act(() => {
      void ecr.current.performPayment('V12345678', 10).catch(() => {});
    });
    await act(async () => {});
    const referenceNo = lastRequest().referenceNo as string;

    receive(stringifyWithCrc({ success: false, type: 'resend', error: 'x', result: -96, referenceNo }));
    expect(mockSentLines.filter((l) => l.includes('"type":"payment"'))).toHaveLength(1);
  });

  it('PKUSB viejo (sin crc) sigue funcionando como antes', async () => {
    const ecr = mountHook();
    let result: string | undefined;
    act(() => {
      void ecr.current.performPayment('V12345678', 46799.16).then((r) => {
        result = r;
      });
    });
    await act(async () => {});
    const referenceNo = lastRequest().referenceNo as string;
    const legacy = JSON.stringify({
      success: true,
      type: 'payment',
      result: 0,
      referenceNo,
      data: APPROVED_DATA,
    });

    receive(legacy);
    await act(async () => {});
    expect(result).toBe(legacy);
    expect(mockSentLines.filter((l) => l.includes('resend'))).toHaveLength(0);
  });
});
