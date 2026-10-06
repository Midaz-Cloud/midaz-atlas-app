import type { LocalComandaRecord, LocalComandaStatus } from '@shared/persistence';

import { serializeLocalComanda } from './serializeLocalComanda';

export const LAN_PROTOCOL_VERSION = 1;
export const LAN_SERVER_TIME_HEADER = 'X-Kiosk-Server-Time';
/** Sin `since` la Comandera recibe lo de las últimas 48 h (lo que el kiosko conserva). */
export const LAN_DEFAULT_WINDOW_MS = 48 * 60 * 60 * 1000;

export type LanRequest = {
  method: string;
  path: string;
  query: string;
  body: string;
};

export type LanResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export type LanRouterDeps = {
  now: () => Date;
  kioskSerial: string | null;
  appVersion: string | null;
  isKioskOnline: () => boolean;
  pendingSync: () => number;
  listComandas: (filter: { since: string }) => Promise<LocalComandaRecord[]>;
  updateComandaStatus: (
    id: string,
    status: LocalComandaStatus,
  ) => Promise<LocalComandaRecord | null>;
};

const STATUSES: readonly LocalComandaStatus[] = ['pending', 'in_progress', 'ready'];
const COMANDA_STATUS_PATH = /^\/lan\/v1\/comandas\/([^/]+)\/status$/;

function error(status: number, message: string): LanResponse {
  return { status, body: { statusCode: status, message } };
}

function queryParam(query: string, name: string): string | null {
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (decodeURIComponent(key ?? '') === name) {
      return decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return null;
}

/** `since` inválido o ausente → ventana por defecto; nunca 400 (la Comandera reintenta a ciegas). */
export function resolveSince(raw: string | null, now: Date): string {
  const parsed = raw ? new Date(raw) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date(now.getTime() - LAN_DEFAULT_WINDOW_MS).toISOString();
}

/**
 * Router puro del servidor LAN (el módulo nativo solo transporta). La clave ya la
 * validó Kotlin; aquí solo rutas, validación y forma de la respuesta.
 */
export async function handleLanRequest(request: LanRequest, deps: LanRouterDeps): Promise<LanResponse> {
  const method = request.method.toUpperCase();
  const path = request.path.replace(/\/+$/, '') || '/';

  if (path === '/lan/v1/health') {
    if (method !== 'GET') return error(405, 'method_not_allowed');
    return {
      status: 200,
      body: {
        ok: true,
        kioskSerial: deps.kioskSerial,
        appVersion: deps.appVersion,
        kioskOnline: deps.isKioskOnline(),
        pendingSync: deps.pendingSync(),
        serverTime: deps.now().toISOString(),
        lanProtocol: LAN_PROTOCOL_VERSION,
      },
    };
  }

  if (path === '/lan/v1/comandas') {
    if (method !== 'GET') return error(405, 'method_not_allowed');
    // La hora se toma ANTES de leer: lo que cambie durante la consulta entra en el próximo poll.
    const serverTime = deps.now();
    const since = resolveSince(queryParam(request.query, 'since'), serverTime);
    const rows = await deps.listComandas({ since });
    return {
      status: 200,
      body: rows.map(serializeLocalComanda),
      headers: { [LAN_SERVER_TIME_HEADER]: serverTime.toISOString() },
    };
  }

  const statusMatch = COMANDA_STATUS_PATH.exec(path);
  if (statusMatch) {
    if (method !== 'PATCH') return error(405, 'method_not_allowed');
    let status: unknown;
    try {
      status = (JSON.parse(request.body || '{}') as { status?: unknown }).status;
    } catch {
      return error(400, 'invalid_json');
    }
    if (!STATUSES.includes(status as LocalComandaStatus)) {
      return error(400, 'invalid_status');
    }
    const id = decodeURIComponent(statusMatch[1] ?? '');
    const updated = await deps.updateComandaStatus(id, status as LocalComandaStatus);
    if (!updated) return error(404, 'comanda_not_found');
    return { status: 200, body: serializeLocalComanda(updated) };
  }

  return error(404, 'not_found');
}
