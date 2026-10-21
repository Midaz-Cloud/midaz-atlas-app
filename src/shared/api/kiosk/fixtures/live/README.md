# Live API response fixtures

Captured responses for kiosk HTTP integration. Do not commit secrets; login JSON only contains a sample JWT from dev.

| File | Endpoint |
|------|----------|
| `login.response.json` | `POST /auth/kiosk/login` |
| `config.response.json` | `GET /kiosk/config` |
| `config.meta.json` | ETag + fetch metadata |
| `products.response.json` | `GET /kiosk/products` (full array) |
| `products.meta.json` | Count + field list |
| `banks.response.json` | `GET /kiosk/banks` (lista de bancos para pago móvil) |

See `INTEGRATION_NOTES.md` and `../liveApi.types.ts`.
