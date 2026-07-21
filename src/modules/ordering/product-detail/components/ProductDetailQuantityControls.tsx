import { KioskQuantityStepper, type KioskQuantityStepperProps } from '@shared/components/KioskQuantityStepper';

export type ProductDetailQuantityControlsProps = Omit<
  KioskQuantityStepperProps,
  'variant' | 'min'
> & {
  min?: number;
};

/** Botones +/- y valor numérico (Figma 35:175–35:184). */
export function ProductDetailQuantityControls({
  min = 1,
  ...props
}: ProductDetailQuantityControlsProps) {
  return <KioskQuantityStepper {...props} min={min} variant="productDetail" />;
}
