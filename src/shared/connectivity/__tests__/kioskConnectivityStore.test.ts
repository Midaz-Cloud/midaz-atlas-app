import {
  __resetKioskConnectivityForTests,
  getKioskConnectivity,
  isKioskOffline,
  markKioskOffline,
  reportKioskNetworkFailure,
  reportKioskNetworkSuccess,
  reportKioskProbeResult,
  resolveNextConnectivityState,
  subscribeKioskConnectivity,
} from '../kioskConnectivityStore';

const BASE = {
  status: 'online' as const,
  lastProbeAt: null,
  lastOnlineAt: null,
  consecutiveFailures: 0,
  lastError: null,
  recentFailures: [] as number[],
  lastRequestFailureAt: null as number | null,
};

describe('resolveNextConnectivityState', () => {
  it('un fallo de red aislado deja degraded; dos en 30 s pasan a offline', () => {
    const one = resolveNextConnectivityState(BASE, { type: 'request_failed', at: 1_000, error: '/kiosk/orders' });
    expect(one.status).toBe('degraded');
    const two = resolveNextConnectivityState(one, { type: 'request_failed', at: 20_000, error: '/kiosk/orders' });
    expect(two.status).toBe('offline');
  });

  it('dos fallos separados por más de 30 s no tiran a offline', () => {
    const one = resolveNextConnectivityState(BASE, { type: 'request_failed', at: 0, error: 'x' });
    const two = resolveNextConnectivityState(one, { type: 'request_failed', at: 45_000, error: 'x' });
    expect(two.status).toBe('degraded');
  });

  it('offline solo sale con un probe OK, no con un éxito aislado', () => {
    const off = resolveNextConnectivityState(BASE, { type: 'probe_failed', at: 0, error: 'timeout' });
    expect(off.status).toBe('offline');
    expect(resolveNextConnectivityState(off, { type: 'request_ok', at: 1 }).status).toBe('offline');
    expect(resolveNextConnectivityState(off, { type: 'probe_ok', at: 100_000 }).status).toBe('online');
  });

  it('probe OK con un fallo de negocio reciente queda degraded', () => {
    const failed = resolveNextConnectivityState(BASE, { type: 'request_failed', at: 1_000, error: 'x' });
    expect(resolveNextConnectivityState(failed, { type: 'probe_ok', at: 10_000 }).status).toBe('degraded');
    expect(resolveNextConnectivityState(failed, { type: 'probe_ok', at: 100_000 }).status).toBe('online');
  });
});

describe('kioskConnectivityStore', () => {
  beforeEach(() => __resetKioskConnectivityForTests());

  it('notifica a los suscriptores y expone isKioskOffline', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeKioskConnectivity((s) => seen.push(s.status));
    reportKioskProbeResult(true);
    markKioskOffline('reserve');
    expect(isKioskOffline()).toBe(true);
    reportKioskNetworkSuccess();
    expect(isKioskOffline()).toBe(true);
    reportKioskProbeResult(true);
    expect(getKioskConnectivity().status).toBe('online');
    unsubscribe();
    reportKioskNetworkFailure('x');
    expect(seen).toEqual(['online', 'offline', 'online']);
  });
});
