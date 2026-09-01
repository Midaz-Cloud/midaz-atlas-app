## Tipos de pedido: la lista manda, el par fijo es solo el fallback
`KioskConfigResponse.orderTypes` viene del panel por sucursal. `null` = par de fábrica (Comer aquí / Para llevar), gateado como siempre por `foodServiceEnabled`; una lista concreta lo reemplaza. `mapConfigToRuntime` resuelve todo en `orderTypeChoices` y `orderTypeSelectionEnabled` pasa a significar "hay 2 o más donde elegir" — con 1 el navigator la auto-aplica y con 0 no se pregunta nada (`IN_STORE`). La etiqueta custom NO se traduce (solo el par de fábrica usa i18n), y la orden viaja con `fulfillment` de la opción elegida, no con el `orderType` derivado, porque dos opciones distintas pueden mapear al mismo dineIn/takeOut. Las HeroSelectionCard son de alto fijo y el layout entra justo con dos (480 de alto + 72 de gap): con 3 se usa `orderTypeCompactLayout` (ratio 2/3, solo eje vertical) para que entren sin scrollear. El panel topea en 3 —web y backend— justamente por eso; subir ese tope exige rehacer este layout primero.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Midaz Atlas: a self-service kiosk app (Android-first) built with bare React Native 0.85 + TypeScript. Flow: introduction → ordering → payment (POS/ECR, cash, pago móvil, Zelle, reference), with fiscal invoice emission and ticket printing. Node >= 22.11.

## Commands

```sh
npm start                 # Metro (scripts/startMetro.js, binds to LAN IP)
npm run android           # Metro + debug build (.env)
npm run android:install   # install only, when Metro already runs in another terminal
npm run android:demo      # Metro + debug build with .env.demo (mock API, feria-safe)
npm run android:release   # release build, JS bundled in APK, no Metro
npm test                  # jest
npm test -- src/shared/pricing                       # tests in one dir
npx jest src/shared/kiosk-order/__tests__/computeOrderTotals.test.ts   # single file
npm run lint              # eslint
npm run storybook         # on-device Storybook (kills port 8081 first)
npm run metro:host        # print PC LAN IP (physical device loads assets from Metro)
```

- Android npm scripts hardcode `ANDROID_HOME=%LOCALAPPDATA%/Android/Sdk` (Windows-style); on macOS that literal value is exported by cross-env — if a build fails on SDK location, that's why (check `android/local.properties` / shell env).
- Env vars come from `react-native-config` (`.env` / `.env.demo`). Changing an env file requires a full native rebuild; JS hot-reloads, env does not.
- Storybook and the app share port 8081 — never run both Metros; switch with `npm run storybook:stop` first. `STORYBOOK_ENABLED=true` makes Metro swap the entry point to `.rnstorybook/`.

## Path aliases

`@assets` → `assets/`, `@modules` → `src/modules/`, `@shared` → `src/shared/`. Declared in **four** places that must stay in sync: `babel.config.js`, `tsconfig.json`, `metro.config.js` (custom `resolveRequest`), `jest.config.js`. Always import assets via `@assets/images/...`, never deep relative paths.

## Architecture

**No react-navigation.** Top-level flow is a hand-rolled state machine: `AppNavigator` (`src/shared/navigation/AppNavigator.tsx`) holds a `KioskFlowStep` (`src/shared/navigation/kioskSession.ts`) and renders `IntroductionNavigator` / `OrderingNavigator` (or `RetailOrderingNavigator`) / `PaymentFlowNavigator`. Each module navigator manages its own internal steps the same way.

**Provider stack** (order matters, see `App.tsx`): `SafeAreaProvider` → `SessionLocaleProvider` (i18n) → `KioskSessionProvider` (bootstrap: login + config + catalog) → `EcrConnectionProvider` → `KioskOrderSessionBridge` (mounts `KioskOrderProvider`) → `KioskCustomerProvider`.

**Order session** (`@shared/kiosk-order`): cart + totals live app-wide, not in navigators or screens — use `useKioskOrder()`; never add local `useState` cart lines (except isolated Storybook stories). Totals via `computeOrderTotals(lines)` or the memoized `totals`. Handoff to payment via `getCheckoutSnapshot()`; payment screens must not recompute totals from scratch. Full kiosk reset = `resetKioskSession` with both `resetOrder` (from `useKioskOrder`) and `resetSession` (from `useSessionLocale`). `useKioskCart` is a deprecated alias.

**Kiosk API** (`src/shared/api/kiosk/`): `factory.ts` picks mock vs live client. `KIOSK_API_USE_MOCK=true` → offline fixtures; `KIOSK_DEMO_MODE=true` **always** forces mock. Live flow: device login (serial-based, `tokenStorage`) → config + products → order POST returning `displayOrderNumber`. Demo scenarios via `KIOSK_DEMO_SCENARIO` (`default | fiscal_error | payment_fail | pos_fail`), happy-path reference suffix `123456`.

**Peripherals** (`src/shared/peripherals/`): each device follows the same pattern — a client interface + `Mock*Client` + real implementation, chosen by a `create*Client` factory (demo/mock mode aware).
- `ecr/`: POS terminal over USB serial; native side is `android/.../ecr/UsbSerialModule.kt`. Falls back to mock when the native module is absent.
- `printer/`: ticket printing; native `android/.../printer/PrinterModule2.kt`; ticket text formatting lives in JS (`formatOrderTicketText`, `formatSettlementTicketText`).
- `fiscal/`: fiscal printer/invoice over HTTP (`HttpFiscalClient`), no native module.
- Device serial: `android/.../device/KioskDeviceModule.kt`, overridable with `KIOSK_DEVICE_SERIAL_OVERRIDE`.

**Persistence** (`src/shared/persistence/`): op-sqlite repos for `failed_payments` (payment salvage/retry) and `pos_successful_transactions` (settlement). If you change their SQL, update the hand-written sqlite mock in `jest.setup.js` to match.

**Tests**: colocated `__tests__/` dirs. `jest.setup.js` globally mocks native deps (sqlite, blob-util, device-info, qrcode) **and `@shared/session`** — tests that need the real session provider must `jest.unmock('@shared/session')` or provide their own mock.

## Recovery de pagos POS

Payloads USB reales para tests van en `src/shared/peripherals/ecr/__fixtures__/` (no en `__tests__/`, jest los tomaría como suites). Filas de `failed_payments` tienen ciclo `status` (`open→salvaged→retry_*`); el salvamento/reintento vive en `src/modules/payment/recovery/` y el reintento de orden es solo manual (riesgo de duplicado).

## Docs

`docs/KIOSK_BILLING_VS_PAYMENT_DOCUMENT.md` and `docs/usb-pos-transaccion.md` cover billing-vs-payment semantics and the USB POS transaction protocol. (README also cites `docs/KIOSK_DEVELOPER_GUIDE.md` / `ECR_NATIVE_MODULE.md` — those files don't exist in the repo.)

## Pendiente: rotar credenciales expuestas (`.env.bak.20260827-dev`)

Ese archivo (commit `cb0b65c`, mergeado a `develop` el 2026-09-01) trae `KIOSK_API_KEY` y `KIOSK_ADMIN_PASSCODE` en texto plano — quedó en la rama `feat/kiosk-order-types`, que hasta esa fecha era solo local y recién se pusheó a GitHub por primera vez. Rotar ambos valores cuando se pueda (no es urgente, repo privado) y, si se quiere sacar el archivo del historial, coordinarlo aparte — reescribir requiere force-push sobre `develop`.
