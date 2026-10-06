import { ensureFiscalReady } from '../ensureFiscalReady';

function deps(healthSequence: boolean[], installed = true) {
  let t = 0;
  const calls = { start: 0 };
  return {
    calls,
    deps: {
      isHealthy: jest.fn(async () => healthSequence.shift() ?? false),
      startFiscalService: jest.fn(async () => {
        calls.start += 1;
        return installed;
      }),
      sleep: jest.fn(async (ms: number) => {
        t += ms;
      }),
      now: () => t,
    },
  };
}

describe('ensureFiscalReady', () => {
  it('lista de entrada: no despierta a HkaApp', async () => {
    const { deps: d, calls } = deps([true]);
    await expect(ensureFiscalReady({}, d)).resolves.toEqual({ ready: true });
    expect(calls.start).toBe(0);
  });

  it('no responde: arranca HkaApp y espera a que se conecte', async () => {
    const { deps: d, calls } = deps([false, false, false, true]);
    await expect(ensureFiscalReady({ timeoutMs: 10_000 }, d)).resolves.toEqual({ ready: true });
    expect(calls.start).toBe(1);
  });

  it('nunca responde: no se cobra', async () => {
    const { deps: d } = deps([]);
    const result = await ensureFiscalReady({ timeoutMs: 5_000 }, d);
    expect(result).toMatchObject({ ready: false, reason: 'printer_unavailable' });
  });
});
