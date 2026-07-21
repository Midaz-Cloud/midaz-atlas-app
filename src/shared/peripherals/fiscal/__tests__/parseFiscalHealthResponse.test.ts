import { parseFiscalHealthEnvelope } from '../parseFiscalHealthResponse';

const HEALTHY_BODY = {
  success: true,
  apiVersion: '1',
  serviceVersion: '0.01.0',
  data: {
    healthy: true,
    serviceRunning: true,
    usbConnected: true,
    transport: 'USB',
    printerStatusCode: 4,
    printerReady: true,
    enqOk: false,
  },
  message: 'Servicio fiscal operativo',
  error: null,
};

const UNHEALTHY_BODY = {
  success: false,
  apiVersion: '1',
  serviceVersion: '0.01.0',
  data: {
    healthy: false,
    serviceRunning: true,
    usbConnected: false,
    transport: null,
    printerStatusCode: -1,
    printerReady: false,
    enqOk: false,
  },
  message: 'Impresora fiscal no disponible',
  error: null,
};

describe('parseFiscalHealthEnvelope', () => {
  it('parses healthy response', () => {
    const envelope = parseFiscalHealthEnvelope(HEALTHY_BODY);

    expect(envelope.success).toBe(true);
    expect(envelope.data?.healthy).toBe(true);
    expect(envelope.data?.usbConnected).toBe(true);
    expect(envelope.data?.printerStatusCode).toBe(4);
    expect(envelope.message).toBe('Servicio fiscal operativo');
  });

  it('parses 503 unhealthy response', () => {
    const envelope = parseFiscalHealthEnvelope(UNHEALTHY_BODY);

    expect(envelope.success).toBe(false);
    expect(envelope.data?.healthy).toBe(false);
    expect(envelope.data?.usbConnected).toBe(false);
  });

  it('handles missing data gracefully', () => {
    const envelope = parseFiscalHealthEnvelope({ success: false, data: null });

    expect(envelope.data).toBeNull();
    expect(envelope.apiVersion).toBe('1');
  });
});
