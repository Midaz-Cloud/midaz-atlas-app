import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { stringifyWithCrc, verifyEcrCrc } from '../ecrIntegrity';
import { applyEcrResponseFault, corruptEcrLine, setEcrFaultMode } from '../ecrFaultInjection';
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

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
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

const paymentLines = () => mockSentLines.filter((l) => l.includes('"type":"payment"'));

const APPROVED_DATA = {
  responseCode: '00',
  responseMessage: 'APPROVED',
  amount: 1000,
  traceNumber: '000266',
  RRN: '621319000266',
  authCode: '123456',
  success: true,
  errorCode: 0,
};

/** Chequeo de versión contestado con crc: así queda PKUSB 1.0.8 del otro lado, como en el cobro real. */
async function handshake108(ecr: { current: UseUsbECRReturn }) {
  let done = false;
  act(() => {
    void ecr.current.performVersionCheck().then(() => {
      done = true;
    });
  });
  await act(async () => {});
  const referenceNo = lastRequest().referenceNo as string;
  receive(
    stringifyWithCrc({
      success: true,
      type: 'version',
      result: 0,
      referenceNo,
      data: { appVersionCode: 17, veslcVersionCode: 117, veslcInstalled: true },
    }),
  );
  await act(async () => {});
  expect(done).toBe(true);
}

type Outcome = { value?: string; error?: unknown };

async function startPayment(ecr: { current: UseUsbECRReturn }): Promise<{ referenceNo: string; out: Outcome }> {
  const out: Outcome = {};
  act(() => {
    ecr.current.performPayment('V12345678', 10).then(
      (value) => {
        out.value = value;
      },
      (error: unknown) => {
        out.error = error;
      },
    );
  });
  await act(async () => {});
  return { referenceNo: lastRequest().referenceNo as string, out };
}


/** PKUSB real: contesta el cobro con su respuesta; a un `resend` le devuelve la misma copia. */
function approvedFor(referenceNo: string) {
  return stringifyWithCrc({ success: true, type: 'payment', result: 0, referenceNo, data: APPROVED_DATA });
}

describe('fallas simuladas del cable (solo debug)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSentLines.length = 0;
  });
  afterEach(() => {
    setEcrFaultMode('off');
    act(() => {
      mounted?.unmount();
    });
    mounted = null;
    jest.useRealTimers();
  });

  it('corruptEcrLine deja el crc inválido', () => {
    const line = approvedFor('REF-1');
    expect(verifyEcrCrc(line)).toBe('valid');
    expect(verifyEcrCrc(corruptEcrLine(line))).toBe('invalid');
  });

  it('respuesta dañada una vez: pide resend y cierra con la copia íntegra, sin cobrar de nuevo', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    setEcrFaultMode('response_once');
    const { referenceNo, out } = await startPayment(ecr);

    receive(approvedFor(referenceNo));
    await act(async () => {});
    expect(out).toEqual({});
    expect(lastRequest()).toMatchObject({ type: 'resend', referenceNo });

    advance(1500);
    receive(approvedFor(referenceNo));
    await act(async () => {});
    expect(out.value).toBe(approvedFor(referenceNo));
    expect(paymentLines()).toHaveLength(1);
  });

  it('una copia tardía de la respuesta de versión no se come la falla de una vez', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    setEcrFaultMode('response_once');
    const { referenceNo, out } = await startPayment(ecr);

    // Segunda entrega de la respuesta de versión, ya con el cobro pendiente.
    receive(
      stringifyWithCrc({ success: true, type: 'version', result: 0, referenceNo: 'VERCHK-1', data: {} }),
    );
    advance(12_000);
    receive(approvedFor(referenceNo));
    await act(async () => {});
    expect(out).toEqual({});
    expect(lastRequest()).toMatchObject({ type: 'resend', referenceNo });
  });

  it('respuesta siempre dañada: a los 45 s usa la copia dañada', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    setEcrFaultMode('response_always');
    const { referenceNo, out } = await startPayment(ecr);

    receive(approvedFor(referenceNo));
    for (let i = 0; i < 10; i += 1) {
      advance(1500);
      receive(approvedFor(referenceNo));
    }
    expect(out).toEqual({});
    advance(45_000);
    await act(async () => {});
    expect(out.value).toBe(corruptEcrLine(approvedFor(referenceNo)));
    expect(paymentLines()).toHaveLength(1);
  });

  it('pedido dañado una vez: sale dañado, PKUSB dice -94 y se reenvía limpio', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    setEcrFaultMode('request_once');
    const { referenceNo, out } = await startPayment(ecr);

    const first = paymentLines()[0]!;
    expect(verifyEcrCrc(first)).toBe('invalid');

    receive(stringifyWithCrc({ success: false, type: 'nack', error: 'crc', result: -94 }));
    expect(paymentLines()).toHaveLength(2);
    expect(verifyEcrCrc(paymentLines()[1]!)).toBe('valid');
    expect(JSON.parse(paymentLines()[1]!).referenceNo).toBe(referenceNo);

    receive(approvedFor(referenceNo));
    await act(async () => {});
    expect(out.value).toBe(approvedFor(referenceNo));
  });

  it('nunca toca el chequeo de versión', () => {
    setEcrFaultMode('response_always');
    const line = '{"type":"version"}';
    expect(applyEcrResponseFault(line, { referenceNo: 'VERCHK-1', type: 'version' })).toBe(line);
  });

  it('en release no corrompe nada', () => {
    const g = globalThis as { __DEV__?: boolean };
    const previous = g.__DEV__;
    g.__DEV__ = false;
    try {
      setEcrFaultMode('response_always');
      const line = approvedFor('REF-2');
      expect(applyEcrResponseFault(line, { referenceNo: 'REF-2', type: 'payment' })).toBe(line);
    } finally {
      g.__DEV__ = previous;
    }
  });
});
