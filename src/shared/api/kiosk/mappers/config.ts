import type { FulfillmentType, KioskConfigResponse } from '../types';

/** Ilustración de respaldo cuando la opción no tiene imagen propia cargada. */
export type KioskOrderTypeImageVariant = 'dineIn' | 'takeOut';

/**
 * Una opción ya resuelta y lista para pintar. `label` es la etiqueta literal que
 * cargó el negocio; cuando es `null` la pantalla la resuelve por i18n con `labelKey`
 * (caso del par de fábrica, que sí se traduce).
 */
export type KioskOrderTypeChoice = {
  id: string;
  label: string | null;
  labelKey: KioskOrderTypeImageVariant | null;
  fulfillment: FulfillmentType;
  image: string | null;
  imageVariant: KioskOrderTypeImageVariant;
};

export type KioskRuntimeConfig = {
  raw: KioskConfigResponse;
  foodServiceEnabled: boolean;
  tableFieldEnabled: boolean;
  printQrEnabled: boolean;
  comandaModel: 'printed' | 'sent';
  enabledPaymentMethods: KioskConfigResponse['enabledPaymentMethods'];
  appearance: KioskConfigResponse['appearance'];
  organization: KioskConfigResponse['organization'];
  /** Opciones activas y usables. Vacío = no se le pregunta nada al cliente. */
  orderTypeChoices: KioskOrderTypeChoice[];
  /** Derived: P3 solo tiene sentido con 2 o más opciones donde elegir. */
  orderTypeSelectionEnabled: boolean;
};

/** Fulfillment por defecto cuando no hay ninguna opción configurada. */
export const DEFAULT_FULFILLMENT: FulfillmentType = 'IN_STORE';

function imageVariantFor(fulfillment: FulfillmentType): KioskOrderTypeImageVariant {
  return fulfillment === 'PICKUP' || fulfillment === 'DELIVERY' ? 'takeOut' : 'dineIn';
}

/** El par que el kiosko mostró siempre, para las sucursales que no configuraron nada. */
function legacyChoices(config: KioskConfigResponse): KioskOrderTypeChoice[] {
  return [
    {
      id: 'legacy-dine-in',
      label: null,
      labelKey: 'dineIn',
      fulfillment: 'IN_STORE',
      image: config.appearance.inStoreImage ?? null,
      imageVariant: 'dineIn',
    },
    {
      id: 'legacy-take-out',
      label: null,
      labelKey: 'takeOut',
      fulfillment: 'PICKUP',
      image: config.appearance.pickupImage ?? null,
      imageVariant: 'takeOut',
    },
  ];
}

function resolveOrderTypeChoices(config: KioskConfigResponse): KioskOrderTypeChoice[] {
  // `null` = la sucursal nunca tocó el panel: se respeta el comportamiento viejo,
  // donde el par salía si y solo si estaba prendido el modo food service.
  if (config.orderTypes == null) {
    return config.foodServiceEnabled ? legacyChoices(config) : [];
  }
  return config.orderTypes
    .filter((option) => option.enabled && option.label.trim())
    .map((option) => ({
      id: option.id,
      label: option.label.trim(),
      labelKey: null,
      fulfillment: option.fulfillment,
      image: option.image ?? null,
      imageVariant: imageVariantFor(option.fulfillment),
    }));
}

export function mapConfigToRuntime(config: KioskConfigResponse): KioskRuntimeConfig {
  const orderTypeChoices = resolveOrderTypeChoices(config);
  return {
    raw: config,
    foodServiceEnabled: config.foodServiceEnabled,
    tableFieldEnabled: config.tableFieldEnabled,
    printQrEnabled: config.printQrEnabled,
    comandaModel: config.comandaModel,
    enabledPaymentMethods: config.enabledPaymentMethods,
    appearance: config.appearance,
    organization: config.organization,
    orderTypeChoices,
    // Con una sola opción no hay nada que elegir: el navigator la aplica y sigue.
    orderTypeSelectionEnabled: orderTypeChoices.length >= 2,
  };
}
