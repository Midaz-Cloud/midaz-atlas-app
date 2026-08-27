import type { KioskApiClient } from '../client';
import { KioskApiError } from '../errors';
import { logKioskCheckoutPayload } from '../logKioskCheckoutPayload';
import {
  getDemoReferenceCode,
  getDemoReferenceVerifyDelayMs,
  getDemoScenario,
  isKioskDemoMode,
} from '@shared/config';

import type {
  CartReserveRequest,
  CartReserveResponse,
  CreateKioskOrderRequest,
  CreateKioskOrderResponse,
  KioskBank,
  KioskConfigFetchResult,
  KioskCustomerApi,
  KioskLoginRequest,
  KioskLoginResponse,
  KioskProductsFetchResult,
  RegisterKioskCustomerRequest,
  ValidateMobilePaymentRequest,
  ValidateMobilePaymentResponse,
  KioskSettlementRequest,
  KioskSettlementResponse,
  KioskZReportRequest,
  KioskZReportResponse,
} from '../types';
import { normalizeDocumentId } from '../utils/documentId';
import { resolveProductAvailable } from '@shared/catalog/productAvailability';

import banksFixture from '../fixtures/live/banks.response.json';
import { getMockApiProducts, getMockConfig, syncMockCatalogFromMenuMocks } from './buildMockFixtures';
import { mockFindCustomerByDocument, mockRegisterCustomer } from './mockCustomers';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockKioskApiClient implements KioskApiClient {
  private cachedEtag = '"mock-etag-1"';
  private productsEtag = '"mock-products-etag-1"';

  async login(_request: KioskLoginRequest): Promise<KioskLoginResponse> {
    await delay(200);
    return { accessToken: `mock-jwt-${Date.now()}` };
  }

  async getConfig(ifNoneMatch?: string | null): Promise<KioskConfigFetchResult> {
    await delay(150);
    if (ifNoneMatch && ifNoneMatch === this.cachedEtag) {
      return { config: getMockConfig(), etag: this.cachedEtag, notModified: true };
    }
    return { config: getMockConfig(), etag: this.cachedEtag, notModified: false };
  }

  async getBanks(): Promise<KioskBank[]> {
    await delay(150);
    return banksFixture as KioskBank[];
  }

  async validateMobilePayment(
    request: ValidateMobilePaymentRequest,
  ): Promise<ValidateMobilePaymentResponse> {
    logKioskCheckoutPayload('POST /kiosk/validate-payment request (mock)', request);
    await delay(getDemoReferenceVerifyDelayMs());

    if (isKioskDemoMode && getDemoScenario() === 'payment_fail') {
      throw new KioskApiError(
        'Pago móvil rechazado por DisGlobal: Transaccion Rechazada (ref: 000000000000)',
        400,
      );
    }

    const demoCode = getDemoReferenceCode();
    const ref = request.reference.trim();
    const matchesDemo =
      ref === demoCode || ref.endsWith(demoCode) || ref.includes(demoCode);

    if (!matchesDemo) {
      throw new KioskApiError(
        'Pago móvil rechazado por DisGlobal: Referencia no encontrada',
        400,
      );
    }

    const response = {
      success: true,
      status: '00',
      disglobalRef: `000${ref.slice(-9).padStart(9, '0')}`.slice(0, 12),
      message: 'Transaccion Validada Correctamente',
      bankResponse: {
        BANCO02: request.bankCode,
        REFER02: ref,
        CODRE02: '00',
      },
    };
    logKioskCheckoutPayload('POST /kiosk/validate-payment response (mock)', response);
    return response;
  }

  async getProducts(ifNoneMatch?: string | null): Promise<KioskProductsFetchResult> {
    await delay(200);
    syncMockCatalogFromMenuMocks();
    const data = getMockApiProducts();
    if (ifNoneMatch && ifNoneMatch === this.productsEtag) {
      return {
        products: { data },
        etag: this.productsEtag,
        notModified: true,
      };
    }
    return {
      products: { data },
      etag: this.productsEtag,
      notModified: false,
    };
  }

  async reserveCart(request: CartReserveRequest): Promise<CartReserveResponse> {
    logKioskCheckoutPayload('POST /kiosk/cart/reserve request (mock)', request);
    await delay(150);
    syncMockCatalogFromMenuMocks();
    const products = getMockApiProducts();
    const productById = new Map(products.map((p) => [p.id, p]));

    const items = request.items.map((item) => {
      const product = productById.get(item.productId);
      const availableQuantity = product ? resolveProductAvailable(product) : 0;
      const reserved = availableQuantity >= item.quantity;
      return {
        productId: String(item.productId),
        reserved,
        availableQuantity,
        requested: item.quantity,
        unitPrice: product ? Number(product.price) : null,
      };
    });

    const allReserved = items.every((item) => item.reserved);
    const response: CartReserveResponse = {
      reservationId: allReserved ? `mock-reservation-${Date.now()}` : null,
      allReserved,
      items,
    };
    logKioskCheckoutPayload('POST /kiosk/cart/reserve response (mock)', response);
    return response;
  }

  async findCustomerByDocument(documentId: string): Promise<KioskCustomerApi> {
    await delay(200);
    const customer = mockFindCustomerByDocument(documentId);
    if (!customer) {
      throw new KioskApiError('Cliente no encontrado', 404);
    }
    return customer;
  }

  async registerCustomer(request: RegisterKioskCustomerRequest): Promise<KioskCustomerApi> {
    await delay(250);
    return mockRegisterCustomer({
      ...request,
      documentId: normalizeDocumentId(request.documentId),
    });
  }

  async createOrder(request: CreateKioskOrderRequest): Promise<CreateKioskOrderResponse> {
    logKioskCheckoutPayload('POST /kiosk/orders request (mock)', request);
    if (
      (request.paymentMethod === 'debito' || request.paymentMethod === 'credito') &&
      !request.posResponse
    ) {
      throw new KioskApiError(
        'Tarjeta requiere posResponse con respuesta del terminal',
        400,
      );
    }
    if (request.posResponse && request.posResponse.responseCode !== '00') {
      throw new KioskApiError('posResponse.responseCode debe ser "00"', 400);
    }
    await delay(300);
    const ts = Date.now();
    const response = {
      id: ts,
      displayOrderNumber: `ORD-DEMO-${String(ts).slice(-6)}`,
      shortCode: `D${String(ts).slice(-3)}`,
      status: 'pending',
      grandTotalVES: 625000,
      grandTotalCurrency: 17,
      currencyCode: 'USD',
      exchangeRate: 36764.7058,
      kioskDeviceId: 'mock-device-id',
    };
    logKioskCheckoutPayload('POST /kiosk/orders response (mock)', response);
    return response;
  }

  async submitSettlement(request: KioskSettlementRequest): Promise<KioskSettlementResponse> {
    logKioskCheckoutPayload('POST /kiosk/settlement request (mock)', request);
    await delay(200);
    const settlementId = request.settlementId ?? `SETTLEMENT-${Date.now()}`;
    const posSerial =
      request.settlementData?.deviceSerial ?? request.posSerial ?? 'N620W322141';
    const response: KioskSettlementResponse = {
      settlementId,
      posSerial,
      branchId: 'mock-branch-id',
      success: request.success,
      processedBy: 'kiosk:mock-device',
      createdAt: new Date().toISOString(),
    };
    logKioskCheckoutPayload('POST /kiosk/settlement response (mock)', response);
    return response;
  }

  async submitZReport(request: KioskZReportRequest): Promise<KioskZReportResponse> {
    logKioskCheckoutPayload('POST /kiosk/z-reports request (mock)', request);
    await delay(150);
    return {
      id: `mock-z-${Date.now()}`,
      cooNumber: request.data.coo,
      fiscalMachineSerial: request.fiscalMachineSerial,
    };
  }
}
