import { getKioskApiUrl } from '@shared/config/api';

import type { KioskApiClient } from '../client';
import { logKioskCheckoutPayload } from '../logKioskCheckoutPayload';
import { KioskApiError, throwIfNotOk } from '../errors';
import { mapCachedConfigBody } from '../configCache';
import { parseCartReserveResponse } from '../mappers/parseCartReserveResponse';
import {
  isLiveConfigShape,
  mapLiveConfigToKioskConfigResponse,
} from '../mappers/liveConfig';
import { parseKioskProductsResponse } from '../mappers/liveProduct';
import { parseCreateKioskOrderResponse } from '../mappers/order';
import {
  loadCachedConfigBody,
  loadCachedProductsBody,
  saveCachedConfigBody,
  saveCachedProductsBody,
} from '../tokenStorage';
import type {
  CartReserveRequest,
  CartReserveResponse,
  CreateKioskOrderRequest,
  CreateKioskOrderResponse,
  KioskBank,
  KioskConfigFetchResult,
  KioskConfigResponse,
  KioskCustomerApi,
  KioskLoginRequest,
  KioskLoginResponse,
  KioskProductsFetchResult,
  RegisterKioskCustomerRequest,
  ValidateMobilePaymentRequest,
  ValidateMobilePaymentResponse,
  KioskSettlementRequest,
  KioskSettlementResponse,
} from '../types';

/** Consume unused OkHttp response bodies (e.g. 304) to avoid connection leaks. */
async function drainResponseBody(response: Response): Promise<void> {
  try {
    await response.arrayBuffer();
  } catch {
    // Ignore — best-effort drain
  }
}

export class HttpKioskApiClient implements KioskApiClient {
  constructor(private readonly accessToken: string) {}

  private apiUrl(path: string): string {
    return getKioskApiUrl(path);
  }

  private headers(extra?: HeadersInit): HeadersInit {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extra as Record<string, string> | undefined),
    };
    if (this.accessToken) {
      base.Authorization = `Bearer ${this.accessToken}`;
    }
    return base;
  }

  async login(request: KioskLoginRequest): Promise<KioskLoginResponse> {
    const response = await fetch(this.apiUrl('/auth/kiosk/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    await throwIfNotOk(response, '/auth/kiosk/login');
    return (await response.json()) as KioskLoginResponse;
  }

  async getConfig(ifNoneMatch?: string | null): Promise<KioskConfigFetchResult> {
    const headers: Record<string, string> = {};
    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }
    const url = ifNoneMatch
      ? this.apiUrl('/kiosk/config')
      : this.apiUrl(`/kiosk/config?_t=${Date.now()}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers(headers),
    });
    if (response.status === 304) {
      await drainResponseBody(response);
      const cached = await loadCachedConfigBody();
      if (!cached) {
        throw new KioskApiError('Config not modified but no local cache', 304);
      }
      const config = mapCachedConfigBody(cached);
      if (!config) {
        throw new KioskApiError('Config cache is invalid', 304);
      }
      return { config, etag: ifNoneMatch ?? null };
    }
    await throwIfNotOk(response, '/kiosk/config');
    const liveBody = await response.json();
    if (!isLiveConfigShape(liveBody)) {
      throw new KioskApiError('Config response shape is invalid', response.status);
    }
    const config = mapLiveConfigToKioskConfigResponse(liveBody);
    const etag = response.headers.get('ETag');
    await saveCachedConfigBody(liveBody);
    return { config, etag };
  }

  async getBanks(): Promise<KioskBank[]> {
    const response = await fetch(this.apiUrl('/kiosk/banks'), {
      method: 'GET',
      headers: this.headers(),
    });
    await throwIfNotOk(response, '/kiosk/banks');
    const body = await response.json();
    if (!Array.isArray(body)) {
      throw new KioskApiError('Banks response shape is invalid', response.status);
    }
    return body as KioskBank[];
  }

  async validateMobilePayment(
    request: ValidateMobilePaymentRequest,
  ): Promise<ValidateMobilePaymentResponse> {
    logKioskCheckoutPayload('POST /kiosk/validate-payment request', request);
    const response = await fetch(this.apiUrl('/kiosk/validate-payment'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });
    await throwIfNotOk(response, '/kiosk/validate-payment');
    const body = (await response.json()) as ValidateMobilePaymentResponse;
    logKioskCheckoutPayload('POST /kiosk/validate-payment response', body);
    return body;
  }

  async getProducts(ifNoneMatch?: string | null): Promise<KioskProductsFetchResult> {
    const headers: Record<string, string> = {};
    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }
    const url = ifNoneMatch
      ? this.apiUrl('/kiosk/products')
      : this.apiUrl(`/kiosk/products?_t=${Date.now()}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers(headers),
    });
    if (response.status === 304) {
      await drainResponseBody(response);
      const cached = await loadCachedProductsBody();
      if (!cached) {
        throw new KioskApiError('Products not modified but no local cache', 304);
      }
      const mappedConfig = mapCachedConfigBody(await loadCachedConfigBody());
      const primaryCurrency = mappedConfig?.organization?.primaryCurrency ?? 'USD';
      return {
        products: parseKioskProductsResponse(cached, primaryCurrency),
        etag: ifNoneMatch ?? null,
        notModified: true,
      };
    }
    await throwIfNotOk(response, '/kiosk/products');
    const body = await response.json();
    const cached = await loadCachedConfigBody();
    const mappedConfig = mapCachedConfigBody(cached);
    const primaryCurrency = mappedConfig?.organization?.primaryCurrency ?? 'USD';
    const products = parseKioskProductsResponse(body, primaryCurrency);
    const etag = response.headers.get('ETag');
    await saveCachedProductsBody(body);
    return { products, etag, notModified: false };
  }

  async reserveCart(request: CartReserveRequest): Promise<CartReserveResponse> {
    logKioskCheckoutPayload('POST /kiosk/cart/reserve request', request);
    const response = await fetch(this.apiUrl('/kiosk/cart/reserve'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });
    await throwIfNotOk(response, '/kiosk/cart/reserve');
    const body = await response.json();
    const parsed = parseCartReserveResponse(body);
    logKioskCheckoutPayload('POST /kiosk/cart/reserve response', parsed);
    return parsed;
  }

  /** TODO: confirm path with backend — expected GET /kiosk/customers?documentId= */
  async findCustomerByDocument(documentId: string): Promise<KioskCustomerApi> {
    const query = new URLSearchParams({ documentId });
    const response = await fetch(this.apiUrl(`/kiosk/customers?${query.toString()}`), {
      method: 'GET',
      headers: this.headers(),
    });
    await throwIfNotOk(response, '/kiosk/customers');
    return (await response.json()) as KioskCustomerApi;
  }

  /** TODO: confirm path with backend — expected POST /kiosk/customers */
  async registerCustomer(request: RegisterKioskCustomerRequest): Promise<KioskCustomerApi> {
    const response = await fetch(this.apiUrl('/kiosk/customers'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });
    await throwIfNotOk(response, '/kiosk/customers');
    return (await response.json()) as KioskCustomerApi;
  }

  async createOrder(request: CreateKioskOrderRequest): Promise<CreateKioskOrderResponse> {
    logKioskCheckoutPayload('POST /kiosk/orders request', request);
    const response = await fetch(this.apiUrl('/kiosk/orders'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });
    await throwIfNotOk(response, '/kiosk/orders');
    const body = await response.json();
    const parsed = parseCreateKioskOrderResponse(body);
    logKioskCheckoutPayload('POST /kiosk/orders response', parsed);
    return parsed;
  }

  async submitSettlement(request: KioskSettlementRequest): Promise<KioskSettlementResponse> {
    // Base QA: https://midazqa.dis-global.com/apis + /api/pos/settlements
    // (un solo /api; evitar /api/api/pos/settlements)
    const settlementPath = '/api/pos/settlements';
    logKioskCheckoutPayload(`POST ${settlementPath} request`, request);
    const response = await fetch(this.apiUrl(settlementPath), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });
    await throwIfNotOk(response, settlementPath);
    const body = (await response.json()) as KioskSettlementResponse;
    logKioskCheckoutPayload(`POST ${settlementPath} response`, body);
    return body;
  }
}
