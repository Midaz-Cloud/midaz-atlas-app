import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { menuProductAddOptions } from '@modules/ordering/menu/menuProductCart';
import { isProductUnavailable } from '@modules/ordering/menu/productAvailability';
import {
  getScanIndexDebugInfo,
  lookupScanCode,
} from '@shared/catalog/catalogStore';
import { useKioskOrder } from '@shared/kiosk-order';

import { logRetailScan } from '../logRetailScan';
import { productRequiresCustomization } from '../retailProductScan';

export type ScanCartErrorKey = 'notFound' | 'unavailable' | 'hasModifiers';

const ERROR_DISMISS_MS = 3500;

export function useScanCartScreen() {
  const { t } = useTranslation('ordering');
  const { addProduct } = useKioskOrder();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const showError = useCallback(
    (key: ScanCartErrorKey) => {
      clearErrorTimer();
      setErrorMessage(t(`scanCart.errors.${key}`));
      dismissTimerRef.current = setTimeout(() => {
        setErrorMessage(null);
        dismissTimerRef.current = null;
      }, ERROR_DISMISS_MS);
    },
    [clearErrorTimer, t],
  );

  useEffect(() => () => clearErrorTimer(), [clearErrorTimer]);

  const handleScan = useCallback(
    (code: string) => {
      const lookup = lookupScanCode(code);
      const indexInfo = getScanIndexDebugInfo();

      logRetailScan('catalog lookup', {
        scannedCode: code,
        normalizedCode: lookup.normalizedCode,
        matchField: lookup.matchField,
        found: lookup.product != null,
        productId: lookup.product?.id,
        productName: lookup.product?.displayName ?? lookup.product?.nameKey,
        productSku: lookup.product?.sku,
        productBarcode: lookup.product?.barcode,
        catalogProductCount: indexInfo.productCount,
        barcodeIndexSize: indexInfo.barcodeIndexSize,
        skuIndexSize: indexInfo.skuIndexSize,
      });

      if (!lookup.product) {
        logRetailScan('product NOT FOUND', {
          scannedCode: code,
          normalizedCode: lookup.normalizedCode,
          indexedBarcodes: indexInfo.barcodeKeys,
          skuKeysSample: indexInfo.skuKeysSample,
        });
        showError('notFound');
        return;
      }

      const product = lookup.product;

      if (isProductUnavailable(product)) {
        logRetailScan('product unavailable (sold out)', {
          productId: product.id,
          available: product.available,
          soldOut: product.soldOut,
        });
        showError('unavailable');
        return;
      }

      if (productRequiresCustomization(product)) {
        logRetailScan('product requires modifiers — not scannable in retail', {
          productId: product.id,
          hasModifiers: product.hasModifiers,
          modifierFlowId: product.modifierFlowId,
        });
        showError('hasModifiers');
        return;
      }

      logRetailScan('product FOUND — adding to cart', {
        matchField: lookup.matchField,
        productId: product.id,
        name: product.displayName ?? product.nameKey,
        sku: product.sku,
        barcode: product.barcode,
        unitPrice: product.unitPrice,
      });

      setErrorMessage(null);
      addProduct(
        product.id,
        product.unitPrice,
        1,
        undefined,
        { ...menuProductAddOptions(product), recentFirst: true },
      );
    },
    [addProduct, showError],
  );

  return { handleScan, errorMessage };
}
