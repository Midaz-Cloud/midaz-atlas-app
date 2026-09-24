import type {  KioskHeartbeatRequest,

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
  KioskSettlementRequest,
  KioskSettlementResponse,
  KioskZReportRequest,
  KioskZReportResponse,
  RegisterKioskCustomerRequest,
  ValidateMobilePaymentRequest,
  ValidateMobilePaymentResponse,
} from './types';

export interface KioskApiClient {
  login(request: KioskLoginRequest): Promise<KioskLoginResponse>;
  getConfig(ifNoneMatch?: string | null): Promise<KioskConfigFetchResult>;
  getProducts(ifNoneMatch?: string | null): Promise<KioskProductsFetchResult>;
  reserveCart(request: CartReserveRequest): Promise<CartReserveResponse>;
  getBanks(): Promise<KioskBank[]>;
  validateMobilePayment(
    request: ValidateMobilePaymentRequest,
  ): Promise<ValidateMobilePaymentResponse>;
  findCustomerByDocument(documentId: string): Promise<KioskCustomerApi>;
  registerCustomer(request: RegisterKioskCustomerRequest): Promise<KioskCustomerApi>;
  /** `idempotencyKey` (default: `request.clientOrderId`) viaja en el header Idempotency-Key. */
  createOrder(
    request: CreateKioskOrderRequest,
    options?: { idempotencyKey?: string },
  ): Promise<CreateKioskOrderResponse>;
  /** null = la venta todavía no existe en el backend. */
  getOrderByClientId(clientOrderId: string): Promise<CreateKioskOrderResponse | null>;
  /** Kiosko vivo + IP en la LAN (la Comandera la descubre por sucursal). */
  sendHeartbeat(body: KioskHeartbeatRequest): Promise<void>;
  submitSettlement(request: KioskSettlementRequest): Promise<KioskSettlementResponse>;
  submitZReport(request: KioskZReportRequest): Promise<KioskZReportResponse>;
}
