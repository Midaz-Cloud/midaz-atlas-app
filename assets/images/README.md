# Kiosk images

## Imports en código

Usa el alias **`@assets`** (configurado en `tsconfig.json` y `babel.config.js`):

```ts
import IconBack from '@assets/images/kiosk/icon-back.svg';

const photo = require('@assets/images/ordering/menu/product-cup-small.png');
```

No uses rutas relativas (`../../../../../assets/...`).

Metro resuelve `@assets` en `metro.config.js` (no solo Babel).

### PNG pendientes de Figma

Si ves imágenes en blanco o 1×1 px, sustituye los placeholders en las rutas listadas abajo por exports reales desde Figma.

Export from Figma and add:

### Shared kiosk UI (`assets/images/kiosk/`)

Used by `KioskScreenLayout` (`showPattern`) and `BackButton`:

- `icon-back.svg` — circular back control
- `cream-screen-pattern.svg` — watermark on cream background

### Ordering · Menú P4 (`assets/images/ordering/menu/`)

From Figma node 35:2 (Menú principal):

- `category-*.png` — category tabs
- `featured-*.png`, `product-*.png` — product photos
- `icon-search.svg`, `icon-add-*.svg`, `icon-cart.svg`, `icon-cart-chevron.svg`

### Ordering · Carrito P7 (`assets/images/ordering/cart/`)

From Figma node 35:316:

- `cart-item-mega-sundae.png` — optional hero for featured line in stories
- `icon-line-minus.svg`, `icon-line-plus.svg`, `icon-line-remove.svg`, `icon-add-more.svg`

### Ordering · Modificadores P6 (`assets/images/ordering/modifiers/`)

From Figma node 35:202:

- `topping-*.png` — oreo, fresas, chispas, gomitas
- `icon-topping-check.svg`, `icon-chip-remove.svg`, `icon-cta-chevron.svg`

### Ordering · Detalle producto P5 (`assets/images/ordering/product-detail/`)

From Figma node 35:146:

- `product-detail-hero.png` — large hero photo
- `icon-quantity-minus.svg`, `icon-quantity-plus.svg`
- `icon-cart-mini.svg`, `icon-cta-chevron.svg`

### Introduction module (`assets/images/introduction/`)

- `flag-es.svg`, `flag-en.svg` — P2 language cards
- `order-type-dine-in.png`, `order-type-take-out.png` — P3 hero cards

Legacy copies (`language-bg-pattern.svg`, `icon-back.svg` in this folder) may be removed once all imports point at `kiosk/`.

### Home (P1) — `assets/images/home/`

From Figma node 19:2 (Idle / Screensaver):

- `home-background.png` — hero photo (full-bleed, offset in `HomeBackground`)
- `home-mask.svg` — tone / mask overlay
- `home-scrim.svg` — vertical gradient scrim
- `logo-midaz.svg` — isotipo + wordmark
- `touch-icon.svg` — dedo en CTA (node 19:30)
- `globe-icon.svg` — badge ES / EN
