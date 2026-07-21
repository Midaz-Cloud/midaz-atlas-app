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
