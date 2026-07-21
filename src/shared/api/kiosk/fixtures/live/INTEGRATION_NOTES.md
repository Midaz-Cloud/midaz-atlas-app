# Live API snapshot (Midaz QA)

**Fetched:** 2026-07-03 from `https://midazqa.dis-global.com/apis` — serial `AF910S20250915004`.

## Endpoints verified

| Method | Path | Fixture |
|--------|------|---------|
| POST | `/auth/kiosk/login` | `login.response.json` |
| GET | `/kiosk/config` | `config.response.json`, `config.meta.json` (ETag) |
| GET | `/kiosk/products` | `products.response.json`, `products.meta.json` |
| GET | `/kiosk/banks` | `banks.response.json` |

No `/api` prefix on this server (base URL includes `/apis`).

## Config summary (this device)

- **Organization:** The Factory HKA (`rif` J-31217119-3)
- **Appearance:** primary `#004be0`, secondary `#07143a` (title/subtitle empty in API)
- **foodServiceEnabled:** `false` → retail / skip order-type screen
- **tableFieldEnabled:** `false`
- **kitchenOrdersEnabled:** `true`
- **comandaModel:** `printed`
- **enabledPaymentMethods:** `debito`, `pago_movil`, `efectivo_ves`, `efectivo_usd`
- **organization.primaryCurrency:** `VES`
- **declaresTaxes:** `false`
- **exchangeRates:** present (usd/eur/date) — see `config.response.json`
- **ETag:** see `config.meta.json`

## Products (43 items)

- Response is a **JSON array** at root, not `{ "data": [...] }`.
- **price** is a **string** (e.g. `"99.99"`).
- **available** / **isAvailable** present (UPDATE-12).
- **barcode:** 3 products with real barcode (`7592946001362`, `7591519000948`, `1008547826356386385385638563`); rest mostly `null` — retail scan falls back to **sku** (`A001`…).
- **modifierGroups:** empty on sampled products (retail-safe for scan flow).

## Refresh fixtures

```powershell
cd MidazAtlasApp
# Ensure .env: KIOSK_API_BASE_URL, KIOSK_API_KEY, device serial registered in QA
# Re-run fetch via Agent or custom script to overwrite *.response.json
```
