export type KioskApiErrorBody = {
  statusCode?: number;
  message?: string;
  path?: string;
  timestamp?: string;
};

export class KioskApiError extends Error {
  readonly statusCode: number;
  readonly body?: KioskApiErrorBody;

  constructor(message: string, statusCode: number, body?: KioskApiErrorBody) {
    super(message);
    this.name = 'KioskApiError';
    this.statusCode = statusCode;
    this.body = body;
  }

  static isAuthError(error: unknown): boolean {
    return error instanceof KioskApiError && error.statusCode === 401;
  }
}

/**
 * La petición no llegó a tener respuesta HTTP (sin red, gateway caído, timeout).
 * Es distinto de un KioskApiError (el backend respondió con un status): con esto
 * el kiosko decide pasar a modo offline en vez de mostrar un error de negocio.
 */
export class KioskNetworkError extends Error {
  readonly kind: 'timeout' | 'network';
  readonly path: string;

  constructor(kind: 'timeout' | 'network', path: string, cause?: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : '';
    super(
      kind === 'timeout'
        ? `Tiempo de espera agotado (${path})`
        : `Sin conexión con el servidor (${path})${detail}`,
    );
    this.name = 'KioskNetworkError';
    this.kind = kind;
    this.path = path;
  }
}

export function isKioskNetworkError(error: unknown): error is KioskNetworkError {
  return error instanceof KioskNetworkError;
}

export async function parseKioskApiError(response: Response): Promise<KioskApiError> {
  let body: KioskApiErrorBody | undefined;
  try {
    body = (await response.json()) as KioskApiErrorBody;
  } catch {
    body = undefined;
  }
  const message = body?.message ?? `Kiosk API error (${response.status})`;
  return new KioskApiError(message, response.status, body);
}

export async function throwIfNotOk(response: Response, path: string): Promise<void> {
  if (response.ok) {
    return;
  }
  const error = await parseKioskApiError(response);
  if (!error.message.includes(path)) {
    error.message = `${error.message} (${path})`;
  }
  throw error;
}
