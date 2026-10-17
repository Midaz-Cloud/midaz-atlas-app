import type {  KioskHeartbeatRequest,
  KioskCustomerSyncPage,

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
  /** Caché de clientes para vender sin red (descarga incremental). */
  syncCustomers(cursor: string | null): Promise<KioskCustomerSyncPage>;
  /**
   * Cédula → cliente de la org (o datos del CNE) autenticado con el token del
   * kiosko (`GET /kiosk/customers/lookup-cedula`). Devuelve el body crudo; 404 =
   * cédula inexistente. El gateway resuelve la org por el JWT: la API key ya no viaja.
   */
  lookupCedula(nacionalidad: string, cedula: string): Promise<unknown>;
  submitSettlement(request: KioskSettlementRequest): Promise<KioskSettlementResponse>;
  submitZReport(request: KioskZReportRequest): Promise<KioskZReportResponse>;
}
