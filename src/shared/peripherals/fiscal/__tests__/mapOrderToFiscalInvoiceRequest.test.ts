import type { CartLine } from '@shared/kiosk-order/types';

import {
  formatFiscalModifierDescription,
  isPaidModifierForFiscal,
  mapLineTaxRateToFiscalCode,
  mapOrderToFiscalInvoiceRequest,
  mapPaymentMethodToFiscalCode,
  shouldEmitFiscalInvoice,
} from '../mapOrderToFiscalInvoiceRequest';

jest.mock('@shared/catalog/catalogStore', () => ({
  getCatalogEntryByLineProductId: () => ({
    product: {
      displayName: 'Cafe Americano',
      taxRate: 16,
      isExempt: false,
    },
    apiProductId: 62,
  }),
}));

const sampleLine: CartLine = {
  lineId: '1',
  productId: 'prod-62',
  quantity: 2,
  unitPrice: 3.5,
  taxRate: 16,
  isExempt: false,
};

describe('shouldEmitFiscalInvoice', () => {
  it('returns true only when declaresTaxes is active', () => {
    expect(shouldEmitFiscalInvoice(true)).toBe(true);
    expect(shouldEmitFiscalInvoice(false)).toBe(false);
    expect(shouldEmitFiscalInvoice(undefined)).toBe(false);
  });

  it('returns true for string "true" from live APIs', () => {
    expect(shouldEmitFiscalInvoice('true')).toBe(true);
    expect(shouldEmitFiscalInvoice('false')).toBe(false);
  });
});

describe('mapPaymentMethodToFiscalCode', () => {
  it('maps kiosk payment methods to PP9 method codes', () => {
    expect(mapPaymentMethodToFiscalCode('cash')).toBe(1);
    expect(mapPaymentMethodToFiscalCode('mobile')).toBe(13);
    expect(
      mapPaymentMethodToFiscalCode('pos', { cardType: 'debito' } as never),
    ).toBe(2);
    expect(
      mapPaymentMethodToFiscalCode('pos', { cardType: 'credito' } as never),
    ).toBe(3);
  });
});

describe('mapLineTaxRateToFiscalCode', () => {
  it('returns 0 when org does not declare taxes', () => {
    expect(mapLineTaxRateToFiscalCode(sampleLine, 16, false, false)).toBe(0);
  });

  it('returns 1 for general IVA 16%', () => {
    expect(mapLineTaxRateToFiscalCode(sampleLine, 16, false, true)).toBe(1);
  });

  it('returns 0 for exempt lines', () => {
    expect(
      mapLineTaxRateToFiscalCode(
        { ...sampleLine, isExempt: true },
        16,
        false,
        true,
      ),
    ).toBe(0);
  });
});

describe('mapOrderToFiscalInvoiceRequest', () => {
  it('returns null when declaresTaxes is false', () => {
    expect(
      mapOrderToFiscalInvoiceRequest({
        lines: [sampleLine],
        customerDocumentId: 'V12345678',
        customerName: 'Juan Perez',
        usdToVesRate: 40,
        declaresTaxes: false,
      }),
    ).toBeNull();
  });

  it('builds fiscal request with customer data and VES prices', () => {
    const request = mapOrderToFiscalInvoiceRequest({
      lines: [sampleLine],
      customerDocumentId: 'v-12345678',
      customerName: 'Juan Perez',
      paymentMethodId: 'mobile',
      primaryCurrency: 'VES',
      usdToVesRate: 40,
      declaresTaxes: true,
    });

    expect(request).toMatchObject({
      rif: 'V12345678',
      businessName: 'Juan Perez',
      mixedPayments: false,
      applyIgtf: false,
    });
    expect(request?.lines).toHaveLength(1);
    expect(request?.lines[0]).toMatchObject({
      taxRateCode: 1,
      price: 3.5,
      quantity: 2,
      description: 'Cafe Americano',
    });
    expect(request?.payments).toEqual([{ methodCode: 13, amount: 0 }]);
  });

  it('converts USD line prices to VES when primary currency is USD', () => {
    const request = mapOrderToFiscalInvoiceRequest({
      lines: [{ ...sampleLine, unitPriceVes: 140 }],
      customerDocumentId: 'V12345678',
      customerName: 'Juan Perez',
      primaryCurrency: 'USD',
      usdToVesRate: 40,
      declaresTaxes: true,
    });

    expect(request?.lines[0].price).toBe(140);
  });

  it('emits base product and paid modifier lines separately', () => {
    const request = mapOrderToFiscalInvoiceRequest({
      lines: [
        {
          lineId: 'yogurt-1',
          productId: 'prod-62',
          quantity: 1,
          unitPrice: 10,
          taxRate: 16,
          modifierSurchargePrimary: 3,
          appliedModifiers: [
            {
              groupId: 'grp-1',
              groupName: 'Toppings',
              optionId: 'oreo',
              optionName: 'Oreo',
              quantity: 2,
              priceDelta: 1,
            },
            {
              groupId: 'grp-1',
              groupName: 'Toppings',
              optionId: 'brownie',
              optionName: 'Brownie',
              quantity: 1,
              priceDelta: 1,
            },
          ],
        },
      ],
      customerDocumentId: 'V12345678',
      customerName: 'Juan Perez',
      primaryCurrency: 'VES',
      usdToVesRate: 40,
      declaresTaxes: true,
    });

    expect(request?.lines).toHaveLength(3);
    expect(request?.lines[0]).toMatchObject({
      description: 'Cafe Americano',
      price: 10,
      quantity: 1,
      taxRateCode: 1,
    });
    expect(request?.lines[1]).toMatchObject({
      description: 'Oreo ×2',
      price: 1,
      quantity: 2,
      taxRateCode: 1,
    });
    expect(request?.lines[2]).toMatchObject({
      description: 'Brownie',
      price: 1,
      quantity: 1,
      taxRateCode: 1,
    });
  });

  it('skips free modifiers on the fiscal invoice', () => {
    const request = mapOrderToFiscalInvoiceRequest({
      lines: [
        {
          lineId: 'cup-1',
          productId: 'prod-62',
          quantity: 1,
          unitPrice: 5,
          appliedModifiers: [
            {
              groupId: 'grp-1',
              groupName: 'Toppings',
              optionId: 'fresas',
              optionName: 'Fresas',
              quantity: 2,
              priceDelta: 0,
            },
            {
              groupId: 'grp-1',
              groupName: 'Toppings',
              optionId: 'brownie',
              optionName: 'Brownie',
              quantity: 1,
              priceDelta: 1.5,
            },
          ],
        },
      ],
      customerDocumentId: 'V12345678',
      customerName: 'Juan Perez',
      primaryCurrency: 'VES',
      usdToVesRate: 40,
      declaresTaxes: true,
    });

    expect(request?.lines).toHaveLength(2);
    expect(request?.lines[1]).toMatchObject({
      description: 'Brownie',
      price: 1.5,
      quantity: 1,
    });
    expect(request?.lines.some((row) => row.description.includes('Fresas'))).toBe(
      false,
    );
  });

  it('emits only the base product when all modifiers are free', () => {
    const request = mapOrderToFiscalInvoiceRequest({
      lines: [
        {
          lineId: 'cup-1',
          productId: 'prod-62',
          quantity: 1,
          unitPrice: 5,
          appliedModifiers: [
            {
              groupId: 'grp-1',
              groupName: 'Toppings',
              optionId: 'oreo',
              optionName: 'Oreo',
              quantity: 2,
              priceDelta: 0,
            },
            {
              groupId: 'grp-1',
              groupName: 'Toppings',
              optionId: 'fresas',
              optionName: 'Fresas',
              quantity: 1,
              priceDelta: 0,
            },
          ],
        },
      ],
      customerDocumentId: 'V12345678',
      customerName: 'Juan Perez',
      primaryCurrency: 'VES',
      usdToVesRate: 40,
      declaresTaxes: true,
    });

    expect(request?.lines).toHaveLength(1);
    expect(request?.lines[0]).toMatchObject({
      description: 'Cafe Americano',
      price: 5,
      quantity: 1,
    });
  });
});

describe('isPaidModifierForFiscal', () => {
  it('returns false for free or empty modifiers', () => {
    expect(
      isPaidModifierForFiscal({
        groupId: 'g',
        groupName: 'Toppings',
        optionId: 'oreo',
        optionName: 'Oreo',
        quantity: 2,
        priceDelta: 0,
      }),
    ).toBe(false);
    expect(
      isPaidModifierForFiscal({
        groupId: 'g',
        groupName: 'Toppings',
        optionId: 'oreo',
        optionName: 'Oreo',
        quantity: 0,
        priceDelta: 1,
      }),
    ).toBe(false);
  });

  it('returns true when modifier has a positive price', () => {
    expect(
      isPaidModifierForFiscal({
        groupId: 'g',
        groupName: 'Toppings',
        optionId: 'brownie',
        optionName: 'Brownie',
        quantity: 1,
        priceDelta: 1.5,
      }),
    ).toBe(true);
  });
});

describe('formatFiscalModifierDescription', () => {
  it('appends multiplier when quantity is greater than one', () => {
    expect(formatFiscalModifierDescription('Oreo', 2)).toBe('Oreo ×2');
    expect(formatFiscalModifierDescription('Oreo', 1)).toBe('Oreo');
  });
});
