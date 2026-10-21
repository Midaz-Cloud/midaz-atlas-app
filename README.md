# Midaz Atlas — kiosco de autoservicio

App Android (React Native **bare** 0.85, TypeScript) que corre en el kiosco AF910 de las sucursales Midaz: el cliente arma el pedido, paga (POS por USB, efectivo, pago móvil, Zelle, referencia), se emite la factura fiscal a través de HkaApp y se imprime el ticket. Habla con el ERP por las rutas `/kiosk/*` del api-gateway y, sin red, sigue vendiendo por LAN contra la Comandera (`docs/KIOSK_OFFLINE_LAN.md`).

## Requisitos

- Node `^20.19.4 || ^22.13 || ^24.3` (lo exige RN 0.85.3; `package.json` solo declara `>= 20.0.0`), JDK 17, Android SDK.
- Los scripts `android*` exportan `ANDROID_HOME=%LOCALAPPDATA%/Android/Sdk` (estilo Windows). En macOS/Linux, si el build falla por la ubicación del SDK, fijá `sdk.dir` en `android/local.properties`.
- Un equipo físico en la misma red que la PC: en debug, imágenes y JS vienen de Metro (`npm run metro:host` imprime la IP).

## Comandos

```sh
npm start                    # Metro (scripts/startMetro.js, escucha en la IP LAN)
npm run android              # Metro + build debug con .env
npm run android:install      # solo instala (Metro ya corriendo en otra terminal)
npm run android:demo         # Metro + build debug con .env.demo
npm run android:release:qa:apk    # APK release con .env.qa.local  (android:release:prod:apk → .env.prod.local)
npm test                     # jest  (npm run lint → eslint)
```

`npm run android:release:apk` a secas usa `.env` (serial de prueba, cobro POS de 1 Bs): **no sirve para un equipo real**. APK en `android/app/build/outputs/apk/release/`.

## Env (`react-native-config`; cambiar un `.env` exige rebuild nativo)

Copiá `.env.example` → `.env`. Las que importan:

| Var | Para qué |
|---|---|
| `KIOSK_API_USE_MOCK` | **El ÚNICO switch de mock.** `true` = fixtures offline; `false` = backend real. `KIOSK_DEMO_MODE` **no** fuerza mock. |
| `KIOSK_API_BASE_URL`, `KIOSK_API_KEY`, `KIOSK_UPLOADS_BASE_URL` | gateway (`http://<ip>:3000`, sin `/api`), API key del kiosco, host de imágenes |
| `KIOSK_DEMO_MODE` (+ `KIOSK_DEMO_SCENARIO`, `KIOSK_DEMO_REFERENCE_CODE`, `KIOSK_DEMO_SHORT_TIMEOUTS`) | capa de demo: banner, escenarios `default | fiscal_error | payment_fail | pos_fail`, timers cortos |
| `KIOSK_TRACK_BASE_URL` | origen de la web para el QR de seguimiento del ticket |
| `KIOSK_DEVICE_SERIAL_OVERRIDE` | serial de prueba cuando el hardware devuelve `unknown` |
| `KIOSK_FISCAL_SERVICE_URL`, `KIOSK_FISCAL_MOCK` | HkaApp en el mismo equipo (`http://127.0.0.1:8765`) / simular la impresora fiscal |

Ojo: el `.env.demo` versionado tiene `KIOSK_API_USE_MOCK=false` y apunta a una IP de la LAN, así que `android:demo` hoy corre contra un backend, no contra el mock.

## Dónde seguir

- `docs/DEVELOPER_HANDBOOK.md` — cómo hago X: navegación, providers, capa de API (15 métodos), periféricos, persistencia, recetas.
- `CLAUDE.md` — por qué esto explotó antes (incidentes y trampas).
- `docs/KIOSK_OFFLINE_LAN.md` — venta sin backend y descubrimiento por LAN.
- `../Midaz-W-Backend/KIOSK_DEVELOPER_GUIDE.md` — el contrato del backend (`/kiosk/*`) con su Addendum 2026-10-17.
- `../hka-app/README.md` — contrato HTTP de la impresora fiscal que consume `src/shared/peripherals/fiscal/HttpFiscalClient.ts`.
