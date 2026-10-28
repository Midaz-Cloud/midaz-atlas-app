import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { stringifyWithCrc } from '../ecrIntegrity';
import { EcrPosOutcomeError } from '../ecrPosOutcomeError';
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
const resendLines = () => mockSentLines.filter((l) => l.includes('"type":"resend"'));

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

describe('useUsbECR — PKUSB 1.0.8', () => {
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

  it('el cobro sale como venta (transType 1)', async () => {
    const ecr = mountHook();
    await startPayment(ecr);
    expect(lastRequest()).toMatchObject({ type: 'payment', transType: 1, amount: 1000 });
    expect(lastRequest()).not.toHaveProperty('timeout');
  });

  it('-97 (ocupado): reenvía el mismo pedido a los 2 s, una sola vez por aviso', async () => {
    const ecr = mountHook();
    const { referenceNo } = await startPayment(ecr);
    const original = paymentLines()[0]!;

    receive(stringifyWithCrc({ success: false, type: 'payment', error: 'Device is busy', result: -97, referenceNo }));
    advance(1999);
    expect(paymentLines()).toHaveLength(1);
    advance(1);
    expect(paymentLines()).toEqual([original, original]);
  });

  it('PKUSB viejo (sin crc): el -97 sigue siendo solo un aviso, no se reenvía', async () => {
    const ecr = mountHook();
    const { referenceNo } = await startPayment(ecr);

    receive(JSON.stringify({ success: false, type: 'payment', error: 'Device is busy', result: -97, referenceNo }));
    advance(5000);
    expect(paymentLines()).toHaveLength(1);
  });

  it('CANCELLED_NO_RESPONSE no es definitivo: pregunta con resend y toma el aprobado tardío', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    const { referenceNo, out } = await startPayment(ecr);

    receive(
      stringifyWithCrc({
        success: true,
        type: 'payment',
        result: 0,
        referenceNo,
        data: { success: false, responseMessage: 'CANCELLED_NO_RESPONSE' },
      }),
    );
    await act(async () => {});
    expect(out).toEqual({});

    advance(3000);
    expect(lastRequest()).toMatchObject({ type: 'resend', referenceNo });

    // Mientras siga cancelado, se sigue esperando.
    receive(
      stringifyWithCrc({
        success: true,
        type: 'payment',
        result: 0,
        referenceNo,
        data: { success: false, responseMessage: 'CANCELLED_NO_RESPONSE' },
      }),
    );
    advance(3000);
    expect(resendLines()).toHaveLength(2);

    const approved = stringifyWithCrc({ success: true, type: 'payment', result: 0, referenceNo, data: APPROVED_DATA });
    receive(approved);
    await act(async () => {});
    expect(out.value).toBe(approved);
    expect(paymentLines()).toHaveLength(1);

    const count = mockSentLines.length;
    advance(30_000);
    expect(mockSentLines).toHaveLength(count);
  });

  it('CANCELLED_NO_RESPONSE sin resultado en 120 s: queda sin confirmar, sin cobrar de nuevo', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    const { referenceNo, out } = await startPayment(ecr);

    receive(
      stringifyWithCrc({
        success: true,
        type: 'payment',
        result: 0,
        referenceNo,
        data: { success: false, responseMessage: 'CANCELLED_NO_RESPONSE' },
      }),
    );
    advance(119_000);
    await act(async () => {});
    expect(out).toEqual({});
    advance(1000);
    await act(async () => {});

    expect(out.error).toBeInstanceOf(EcrPosOutcomeError);
    expect((out.error as EcrPosOutcomeError).outcome).toBe('unconfirmed');
    expect(paymentLines()).toHaveLength(1);
  });

  it('vence la espera: pide resend antes de darlo por perdido y recupera la respuesta', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    const { referenceNo, out } = await startPayment(ecr);

    advance(120_000);
    expect(lastRequest()).toMatchObject({ type: 'resend', referenceNo });

    const approved = stringifyWithCrc({ success: true, type: 'payment', result: 0, referenceNo, data: APPROVED_DATA });
    receive(approved);
    await act(async () => {});
    expect(out.value).toBe(approved);
  });

  it('vence la espera y PKUSB ya no tiene la respuesta (-96): sin confirmar', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    const { referenceNo, out } = await startPayment(ecr);

    advance(120_000);
    receive(stringifyWithCrc({ success: false, type: 'resend', error: 'not found', result: -96, referenceNo }));
    await act(async () => {});

    expect((out.error as EcrPosOutcomeError).outcome).toBe('unconfirmed');
    expect(paymentLines()).toHaveLength(1);
  });

  it('vence la espera y nadie contesta los resend: sin confirmar a los 15 s', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    const { out } = await startPayment(ecr);

    advance(120_000 + 15_000);
    await act(async () => {});
    expect((out.error as EcrPosOutcomeError).outcome).toBe('unconfirmed');
    expect(resendLines().length).toBeGreaterThanOrEqual(5);
  });

  it('-99 (la operación anterior sigue pendiente): no se reintenta y queda marcado', async () => {
    const ecr = mountHook();
    await handshake108(ecr);
    const { referenceNo, out } = await startPayment(ecr);

    receive(
      stringifyWithCrc({
        success: false,
        type: 'payment',
        error: 'El datáfono sigue procesando la operación anterior (REF-1). Verificar en el POS antes de reintentar.',
        result: -99,
        referenceNo,
      }),
    );
    await act(async () => {});
    advance(10_000);

    expect((out.error as EcrPosOutcomeError).outcome).toBe('previous_pending');
    expect(paymentLines()).toHaveLength(1);
  });

  it('PKUSB viejo (sin crc): al vencer la espera falla como antes, sin resend', async () => {
    const ecr = mountHook();
    const { out } = await startPayment(ecr);

    advance(120_000);
    await act(async () => {});
    expect(out.error).toBeInstanceOf(Error);
    expect(out.error).not.toBeInstanceOf(EcrPosOutcomeError);
    expect(resendLines()).toHaveLength(0);
  });
});
