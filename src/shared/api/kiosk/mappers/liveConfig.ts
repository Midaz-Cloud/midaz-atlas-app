import type {
  KioskConfigResponseLive,
  KioskOrderTypeOptionLive,
  KioskPagoMovilAccountLive,
} from '../liveApi.types';
import type {
  FulfillmentType,
  KioskConfigResponse,
  KioskOrderTypeOption,
  KioskPagoMovilAccount,
  PaymentMethodApi,
} from '../types';
import { parseDeclaresTaxes } from '../utils/declaresTaxes';

const KNOWN_PAYMENT_METHODS: readonly PaymentMethodApi[] = [
  'debito',
  'credito',
  'pago_movil',
  'efectivo',
  'efectivo_ves',
];

function mapPagoMovilAccount(
  live: KioskPagoMovilAccountLive | null | undefined,
): KioskPagoMovilAccount | null {
  if (!live) {
    return null;
  }
  return {
    bank: live.bank ?? '',
    bankCode: live.bankCode ?? '',
    phone: live.phone ?? '',
    cedula: live.cedula ?? '',
    holder: live.holder ?? '',
  };
}

export function normalizeEnabledPaymentMethods(
  methods: string[],
): PaymentMethodApi[] {
  return methods.filter((m): m is PaymentMethodApi =>
    (KNOWN_PAYMENT_METHODS as readonly string[]).includes(m),
  );
}

/** Maps live GET /kiosk/config body to guide/mock `KioskConfigResponse`. */
export function mapLiveConfigToKioskConfigResponse(
  live: KioskConfigResponseLive,
): KioskConfigResponse {
  const liveAppearance = live.appearance || {};
  return {
    id: live.id ?? 'live-config-id',
    kioskDeviceId: live.kioskDeviceId ?? 'live-device-id',
    foodServiceEnabled: live.foodServiceEnabled ?? false,
    tableFieldEnabled: live.tableFieldEnabled ?? false,
    printQrEnabled: live.printQrEnabled ?? false,
    comandaModel: live.comandaModel ?? 'printed',
    enabledPaymentMethods: normalizeEnabledPaymentMethods(live.enabledPaymentMethods ?? []),
    kioskInvoicingType: live.kioskInvoicingType ?? null,
    appearance: {
      primaryColor: liveAppearance.primaryColor ?? '#004be0',
      secondaryColor: liveAppearance.secondaryColor ?? '#07143a',
      title: liveAppearance.title ?? 'Bienvenido',
      subtitle: liveAppearance.subtitle ?? 'Realizá tu pedido aquí',
      coverImage: liveAppearance.coverImage ?? null,
      pickupImage: liveAppearance.pickupImage ?? null,
      inStoreImage: liveAppearance.inStoreImage ?? null,
      titleColor: liveAppearance.titleColor ?? null,
      subtitleColor: liveAppearance.subtitleColor ?? null,
      languages: liveAppearance.languages ?? null,
      translations: liveAppearance.translations ?? null,
    },
    organization: {
      name: live.organization.name,
      legalName: live.organization.legalName,
      rif: live.organization.rif,
      logo: live.organization.logo,
      primaryCurrency: live.organization.primaryCurrency ?? 'USD',
      declaresTaxes: parseDeclaresTaxes(live.organization.declaresTaxes),
      invoicingType: live.organization.invoicingType ?? null,
    },
    pagoMovilAccount: mapPagoMovilAccount(live.pagoMovilAccount),
    exchangeRates: live.exchangeRates ?? live.rates ?? null,
    orderTypes: mapOrderTypes(live.orderTypes),
  };
}

const KNOWN_FULFILLMENTS: readonly FulfillmentType[] = ['IN_STORE', 'DINE_IN', 'PICKUP', 'DELIVERY'];

/**
 * `null`/ausente = el kiosko sigue con el par de fábrica. Se descartan las opciones
 * sin etiqueta o con un fulfillment que esta versión de la app no conoce, en vez de
 * romper el bootstrap entero por una fila mal cargada en el panel.
 */
function mapOrderTypes(
  live: KioskOrderTypeOptionLive[] | null | undefined,
): KioskOrderTypeOption[] | null {
  if (live == null) {
    return null;
  }
  return live.reduce<KioskOrderTypeOption[]>((acc, option) => {
    const label = (option?.label ?? '').trim();
    const fulfillment = option?.fulfillment as FulfillmentType | undefined;
    if (!option?.id || !label || !fulfillment || !KNOWN_FULFILLMENTS.includes(fulfillment)) {
      return acc;
    }
    acc.push({
      id: option.id,
      label,
      fulfillment,
      image: option.image ?? null,
      enabled: option.enabled !== false,
    });
    return acc;
  }, []);
}

export function isLiveConfigShape(body: unknown): body is KioskConfigResponseLive {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const o = body as Record<string, unknown>;
  
  // Must have organization to be any kind of config
  if (typeof o.organization !== 'object' || o.organization == null) {
    return false;
  }

  // If it has 'rates' or 'kitchenOrdersEnabled' or lacks 'appearance', it's definitely the live config shape from the backend
  if ('rates' in o || 'kitchenOrdersEnabled' in o || !('appearance' in o) || o.appearance == null) {
    return true;
  }

  // Also check if o.appearance is missing required mapped fields like primaryColor or secondaryColor
  const app = o.appearance as Record<string, unknown>;
  if (typeof app.primaryColor !== 'string' || typeof app.secondaryColor !== 'string') {
    return true;
  }

  // For test compatibility with fresh liveBody which has createdAt/updatedAt
  if ('createdAt' in o || 'updatedAt' in o) {
    return true;
  }

  return false;
}
