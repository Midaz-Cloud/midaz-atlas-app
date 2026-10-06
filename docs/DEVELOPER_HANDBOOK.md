# Manual del desarrollador — Midaz Atlas (kiosco AF910)

> Este archivo responde **"¿cómo hago X?"**. `CLAUDE.md` responde **"¿por qué esto explotó antes?"**.
> Contexto transversal de los 8 repos: `../../docs/ECOSISTEMA.md`.
> Todo lo de abajo está verificado abriendo el código. Lo no verificable está marcado. §10 corrige afirmaciones falsas del README y del propio CLAUDE.md.

React Native **bare** 0.85.3 · React 19.2 · TypeScript 5.8 · Node ≥ 22.11 · Android-first (`com.midazatlasapp`)

---

## 0. Lo primero

| Hecho | Dónde |
|---|---|
| **No hay react-navigation.** Ni siquiera está en `package.json`. La navegación es estado de React + render condicional, en dos niveles. | §2 |
| **`KIOSK_API_USE_MOCK` es el único switch de mock.** `KIOSK_DEMO_MODE` **no** fuerza mock, por más que el README y el CLAUDE.md digan lo contrario. | `src/shared/config/api.ts:53-60` |
| `parseBooleanEnv` acepta **solo** el string literal `'true'`. | `src/shared/config/env.ts` |
| Los valores de `react-native-config` se **hornean en el build nativo**. Editar `.env` exige rebuild completo; el JS sí hace hot-reload. | — |
| El carrito y los totales **nunca** son estado local de pantalla: siempre `useKioskOrder()`. | §4 |
| Los tres aliases (`@assets`, `@modules`, `@shared`) están declarados en **cuatro** archivos que tienen que coincidir. | §1.3 |
| `jest.setup.js` mockea **`@shared/session` globalmente** — y el mock está desactualizado. | §9.3 |

---

## 1. Estructura

```
src/modules/<dominio>/     pantallas y lógica de dominio
src/shared/                infraestructura transversal
android/app/src/main/java/com/midazatlasapp/   módulos nativos Kotlin
```

Cinco módulos: `introduction/` (home, language-selection, order-type), `ordering/` (menu, product-detail, modifiers, cart, stock, retail), `payment/` (16 sub-áreas), `customer/`, `locator/`.

Áreas compartidas: `api/kiosk/`, `catalog/`, `components/`, `config/`, `customer/`, `device/`, `hooks/`, `i18n/`, `inactivity/`, `kiosk-order/`, `mail/`, `modifiers/`, `navigation/`, `peripherals/`, `persistence/`, `phone/`, `pricing/`, `session/`, `theme/`, `ui/`, `utils/`.

> ⚠️ **No existe `peripherals/device/`** — el código de serial está en `src/shared/device/`. El CLAUDE.md dice lo contrario.

Convenciones: pantallas `*Screen.tsx` (33); `__tests__/` colocados (141 archivos); `*.stories.tsx` colocados (85); cada área compartida expone un barrel `index.ts`.

⚠️ **Los fixtures de payloads USB crudos van en `src/shared/peripherals/ecr/__fixtures__/`, nunca en `__tests__/`** — jest trataría el archivo como suite.

### 1.3 Los cuatro archivos de aliases

`@assets` → `assets/` · `@modules` → `src/modules/` · `@shared` → `src/shared/`

| Archivo | Mecanismo |
|---|---|
| `babel.config.js` | `babel-plugin-module-resolver` (y `react-native-reanimated/plugin` **debe quedar último**) |
| `tsconfig.json` | `baseUrl` + `paths` |
| `metro.config.js` | `resolver.resolveRequest` custom sobre un mapa `ALIASES` de rutas absolutas |
| `jest.config.js` | `moduleNameMapper` |

Cambiar un alias sin tocar los cuatro rompe una capa distinta en cada caso (typecheck, bundling, o los tests).

---

## 2. La máquina de estados de navegación

### Nivel superior — `src/shared/navigation/`

`kioskSession.ts` define `KioskFlowStep = 'introduction' | 'ordering' | 'payment'` y `resetKioskSession({...})`, que ejecuta en orden: `resetOrder()` → `clearCustomer()` → `await resetLocale()` → `setFlowStep('introduction')`.

`AppNavigator.tsx` tiene el `useState<KioskFlowStep>` y conmuta entre `IntroductionNavigator`, `PaymentFlowNavigator` y —según `runtimeConfig.foodServiceEnabled`— `OrderingNavigator` o `RetailOrderingNavigator`.

`handleExitToIntroduction()` es **el único camino de reset**; `handleSessionComplete` y `handleSessionExpire` son alias de él.

### Nivel de módulo — mismo patrón, tipo de paso propio

| Navigator | Estado | Pasos |
|---|---|---|
| `IntroductionNavigator` | `IntroductionStep` | `home \| language \| orderType \| admin \| failedPayments \| failedPaymentDetail` |
| `OrderingNavigator` (670 ln) | `OrderingRoute`, **unión discriminada que lleva los params** | `menu \| product-detail \| modifiers \| cart \| out-of-stock` |
| `PaymentFlowNavigator` | flags de paso | customer → (opcional) locator → `PaymentNavigator` |
| `PaymentNavigator` (920 ln) | `PaymentRoute` | `method-select \| flow \| cash \| reference \| processing \| pos-charging \| outcome \| payment-error \| assistance \| stock-shortage` |
| `CustomerNavigator` | `CustomerRoute` | `lookup \| register` |

**El modelo de capas de `OrderingNavigator`:** en vez de montar y desmontar, `src/modules/ordering/orderingLayers.ts` devuelve `active | parked | unmounted` por capa, así el menú nunca se desmonta y detalle/modifiers quedan "parked" (montados, ocultos) a lo largo del wizard. **Agregá tu paso ahí, no con un condicional suelto.**

**Resumen del mecanismo:** no hay historial, ni deep links, ni URL. El "back" es un callback explícito (`onBack`, `onBackToCart`, `onExit`) que setea el estado del padre. Los params de ruta viajan como campos del objeto de ruta. Los datos que cruzan flujos (carrito, cliente, tipo de orden, mesa) viven en providers, no en params.

---

## 3. El stack de providers — `App.tsx`

```
SafeAreaProvider
└ SessionLocaleProvider        i18n; debe estar ARRIBA del session provider (el bootstrap llama applyLanguagePolicy)
  └ KioskSessionProvider       bootstrap: login → config → products → images. ES UN GATE.
    └ EcrConnectionProvider    calienta el POS USB una vez por sesión; debe estar ABAJO del session provider
      └ KioskOrderSessionBridge  monta KioskOrderProvider derivando sus props del estado de sesión
        └ KioskCustomerProvider
          └ AppNavigator
```

**`KioskSessionProvider` es un gate:** renderiza `KioskBootstrapLoadingScreen` mientras `status === 'loading'`, una vista de error con retry en `'auth_error'`, y recién en `'ready'` renderiza los children.

El bootstrap (`src/shared/session/bootstrapKioskSession.ts`) hace: serial → `login({serialNumber, apiKey})` → `saveAccessToken` → cliente nuevo con token → `getConfig(null)` (**deliberadamente sin ETag en el arranque**, para no comerse un ETag viejo del backend) → `getProducts(null)` → sync de imágenes (los fallos se tragan). Si algo revienta: si `shouldUseMockApi()` degrada a una sesión mock completa; si no, `auth_error`.

Ya en `ready`, arranca `startKioskCatalogSync` con dos intervalos de 60 s (config y productos), ambos con `If-None-Match`. Se saltea en modo mock.

**`KioskOrderSessionBridge`** es donde realmente se monta `KioskOrderProvider`. Detalle importante: en **modo vivo** manda `vatRate: 0` porque el IVA viene por línea, no de una tasa plana. El fallback de `usdToVesRate` es `36.5`.

---

## 4. Carrito y totales

Todo por `useKioskOrder()` de `@shared/kiosk-order`. Los totales salen de `computeOrderTotals(lines)` o del `totals` memoizado.

**Las pantallas de pago no recalculan totales** — reciben el handoff por `getCheckoutSnapshot()`.

⚠️ **Hoy ese contrato no está aplicado:** el resultado de `getCheckoutSnapshot()` se descarta en `AppNavigator.tsx:66`. Nada congela los totales. Si vas a tocar el checkout, esto es lo primero que hay que arreglar.

`useKioskCart` es un alias `@deprecated` de `useKioskOrder`. `src/modules/ordering/data/mockOrderFiscalConfig.ts` es otro re-export deprecado — pero ojo, `defaultOrderFiscalConfig` vive ahí y **se usa también en modo vivo** (de ahí salen `igtfRate` y el fallback de tasa).

---

## 5. La capa de API — `src/shared/api/kiosk/`

### Selección de cliente
```ts
createKioskApiClient(accessToken?) → shouldUseMockApi() ? MockKioskApiClient (singleton) : new HttpKioskApiClient(token)
```

**`shouldUseMockApi()` lee ÚNICAMENTE `KIOSK_API_USE_MOCK`.** El comentario del propio archivo lo dice: *"Demo mode (`KIOSK_DEMO_MODE`) does not override this."*

### La capa demo — `src/shared/config/demo.ts`
`KIOSK_DEMO_MODE` prende el banner, los escenarios y los timeouts cortos, pero **no** el mock. Escenarios: `default | fiscal_error | payment_fail | pos_fail`. `KIOSK_DEMO_REFERENCE_CODE` (default `123456`) es la referencia de pago móvil que el mock acepta.

### Storage de token y caché — `tokenStorage.ts` (AsyncStorage)
Claves `@kiosk/accessToken`, `@kiosk/accessTokenExpiresAt`, `@kiosk/configEtag`, `@kiosk/configBody`, `@kiosk/productsEtag`, `@kiosk/productsBody`, `@kiosk/lastPosSerial`. TTL de token **24 h**, auto-expira al cargar. Los bancos tienen su propia caché de 24 h.

### Los 11 endpoints de la interfaz

Base `KIOSK_API_BASE_URL` (default `http://localhost:3000`, **sin prefijo `/api`** — el gateway del ERP no lo usa). Non-2xx → `KioskApiError(message, statusCode, body)`.

| # | Método + path | Nota |
|---|---|---|
| 1 | `POST /auth/kiosk/login` | `{serialNumber, apiKey}`, **sin header Authorization** → `{accessToken}` (24 h) |
| 2 | `GET /kiosk/config` | `If-None-Match`; **sin ETag agrega un cache-buster `?_t=<now>`**. `304` → se remapea desde `@kiosk/configBody` |
| 3 | `GET /kiosk/products` | mismo patrón de ETag |
| 4 | `POST /kiosk/cart/reserve` | `{items:[{productId, quantity}], ttlMinutes?}` → `{reservationId, allReserved, items[]}` |
| 5 | `GET /kiosk/banks` | → `{code, name}[]` |
| 6 | `POST /kiosk/validate-payment` | lee `response.text()` primero y arma el error a mano, para que sobreviva el mensaje del banco. Éxito = `success===true && status==='00'` |
| 7 | `GET /kiosk/customers?documentId=` | ⚠️ lleva un `TODO: confirm path with backend` |
| 8 | `POST /kiosk/customers` | el registro vivo va en realidad por `http/customerCreate.ts` |
| 9 | `POST /kiosk/orders` | ver §5.1 |
| 10 | `POST /kiosk/settlement` | |
| 11 | `POST /kiosk/z-reports` | |

**Fuera de la interfaz:** `GET /customers/lookup-cedula` (**sin Bearer, apiKey en query string**), `PATCH /kiosk/customers/{id}`, `POST /kiosk/generate-payment-qr`.

### 5.1 El contrato de orden — plata primero, orden después

El backend documenta esto en `../../Midaz-W-Backend/KIOSK_DEVELOPER_GUIDE.md` (no está en este repo). Lo esencial:

1. **`POST /kiosk/cart/reserve` es obligatorio antes de cualquier cobro.** Es atómico y todo-o-nada, TTL 5 min. Sin reserva, dos kioscos cobran la misma última unidad — y cobrar sin stock disponible es una infracción fiscal ante el SENIAT.
2. **La orden se crea solo después de confirmar el pago.** Tarjeta: solo si `posResponse.responseCode === "00"`. Pago móvil: solo si `status === "00"`. Efectivo es la excepción — la orden entra `PENDIENTE` y el cajero confirma el cobro en el panel.
3. Si el pago falla, **la reserva sigue viva** y se puede reusar el mismo `reservationId` con otro método.
4. `branchId`, `organizationId` y `kioskDeviceId` los inyecta el backend desde el JWT — **nunca los mandes**.
5. `posBound: false` en el login = modo degradado: ocultá `debito`, `credito` y `pago_movil_qr`, dejá efectivo y pago móvil manual. **El cliente no debe ver ningún error.**
6. `taxRate` va como entero (`16`), no como string.

---

## 6. Periféricos — `src/shared/peripherals/`

Solo tres carpetas: `ecr/`, `printer/`, `fiscal/`.

**Patrón uniforme:** `<Name>Client.ts` (interfaz) + `Mock<Name>Client.ts` + implementación real + `create<Name>Client.ts` (singleton + `reset<Name>ClientForTests()`).

| Periférico | Real | Selector |
|---|---|---|
| ECR (POS N620) | `NativeEcrClient` sobre el módulo Kotlin `UsbSerialModule` | `shouldUseMockApi()` |
| Impresora | `NativePrinterClient` sobre `PrinterModule2` | `!KIOSK_PRINTER_MOCK && NativeModules.PrinterModule2 != null` |
| Fiscal | `HttpFiscalClient` — **HTTP, no nativo**: pega a `hka-app` en `127.0.0.1:8765` | `KIOSK_FISCAL_MOCK` |

### El ECR, en corto
`UsbSerialModule.kt`: 115200-8-N-1, permiso `com.midazatlasapp.USB_PERMISSION`, **sleep de 300 ms antes de la primerísima escritura** (sin eso el primer comando se pierde en algunas unidades), `write(data, 2000)`.

Del lado JS, `ecr/useUsbECR.ts` (377 ln) es el orquestador: **una sola transacción pendiente a la vez**, `sendAndWait(payload, 120_000)`.

⚠️ **Nunca `JSON.parse()` una respuesta del POS.** El N620 antepone basura y el USB no da framing. Por eso existe todo este arsenal: `extractLastBalancedJson.ts` (escanea de derecha a izquierda buscando el candidato balanceado más largo), `parseEcrPaymentJson.ts`, `pickEcrPaymentFields.ts`, `fuzzyEcrFieldExtract.ts`, `isTransientEcrResponse.ts` (filtra los `result: -97` de "busy", que si no resolverían la promesa antes de tiempo con basura), `posPaymentSuccessCascade.ts`.

`toEcrTerminalAmount.ts` manda el monto en **centésimas** (`Math.round(ves*100)`).

---

## 7. Persistencia — `src/shared/persistence/`

Repos op-sqlite para `failed_payments` (rescate y reintento de pagos) y `pos_successful_transactions` (settlement). El ciclo de estado es `open → salvaged → retry_*`. La lógica de rescate vive en `src/modules/payment/recovery/`; **el reintento de orden es solo manual**, por riesgo de cobro doble.

⚠️ **`jest.setup.js` tiene una base SQLite en memoria escrita a mano.** Cambiar el orden de columnas, agregar una columna a un INSERT, agregar una forma de query nueva o cambiar el orden del `SET` en `updateFailedPaymentStatus` **convierte los tests en no-ops en silencio** en vez de fallar. Actualizá el mock en el mismo commit.

---

## 8. Recetas

### (a) Agregar una pantalla a un paso existente
1. `src/modules/<módulo>/<área>/<Nombre>Screen.tsx`. Props = callbacks planos (`onBack`, `onContinue`). **Nunca leas el carrito localmente**: `useKioskOrder()`.
2. Agregá el paso al tipo de ruta del módulo (`IntroductionStep`, `OrderingRoute`, `PaymentRoute`, `CustomerRoute`). **Los params van en el miembro de la unión**, no en un estado aparte.
3. Agregá la rama en el render del navigator y un `useCallback` de transición. En `OrderingNavigator` decidí además el modo de capa en `orderingLayers.ts`.
4. Si el paso tiene que cambiar el flujo de nivel superior, pasá un callback hacia arriba hasta `AppNavigator` — **no importes `setFlowStep` en ningún otro lado**.
5. Claves i18n en `src/shared/i18n/locales/{es,en}/`. `es` es el default y `en` tiene que existir.
6. `<Nombre>Screen.stories.tsx` al lado + un `__tests__/` hermano.
7. Assets como `@assets/images/...`, nunca rutas relativas profundas.

### (b) Agregar una llamada de API
1. Tipos en `src/shared/api/kiosk/types.ts` (las formas de cable vivas van en `liveApi.types.ts` si difieren de la mapeada).
2. Agregá el método a la interfaz `KioskApiClient` en `client.ts`.
3. Implementalo en `http/HttpKioskApiClient.ts`: `this.apiUrl(...)`, `this.headers()`, `await throwIfNotOk(response, path)`, y `logKioskCheckoutPayload` alrededor de request y response para todo lo que toque plata. Si va cacheado por ETag, seguí el patrón de `getConfig`.
4. **Implementá el mismo método en `MockKioskApiClient` — si no, la clase no compila.**
5. Si la respuesta necesita reshape, mapper en `mappers/` con su `__tests__/`.
6. Exportá desde `src/shared/api/kiosk/index.ts` (el barrel es explícito, no `export *`).
7. Env nueva → `react-native-config.d.ts` **y** `.env.example` **y** `.env.demo.example` **y** un getter en `src/shared/config/api.ts`.

### (c) Agregar o modificar un periférico
1. Carpeta nueva con interfaz + mock + real + factory + `index.ts`.
2. El predicado de selección va en `src/shared/config/`, siempre con `parseBooleanEnv` y un chequeo `NativeModules.X != null`.
3. Nativo: `<Name>Module.kt` bajo `android/app/src/main/java/com/midazatlasapp/<área>/`, con `getName()` coincidiendo con la clave de `NativeModules`, su `<Name>Package.kt`, y registralo en `MainApplication.kt`. **Cambiar código nativo exige rebuild completo.**
4. Mantené el formateo y el parseo en JS (como hacen printer y ECR) para que sea testeable. Fixtures de payload crudo en `__fixtures__/`.
5. Agregá el mock en `jest.setup.js` o el módulo nuevo revienta todas las suites.

### (d) Correr en un dispositivo desde cero
```sh
node -v                    # >= 22.11.0
npm ci
cp .env.example .env       # KIOSK_API_BASE_URL y KIOSK_UPLOADS_BASE_URL a la IP LAN de esta Mac,
                           # KIOSK_API_KEY, y KIOSK_API_USE_MOCK
npm run metro:host         # imprime la IP LAN
npm run android            # adb reverse tcp:8081 + run-android
```
Dos terminales: `npm run start` + `npm run android:install`.
Demo: `npm run android:demo` (usa `ENVFILE=.env.demo`).
Release: `npm run android:release` (ABIs `armeabi-v7a,arm64-v8a`).

⚠️ **Los valores de `react-native-config` se hornean en el build nativo.** Editar `.env` exige rebuild.

⚠️ **Todos los scripts de Android hardcodean rutas de Windows** (`ANDROID_HOME=%LOCALAPPDATA%/Android/Sdk`) y `scripts/installAndroidReleaseApk.js` busca `platform-tools/adb.exe`. En macOS esos literales se exportan tal cual, así que la resolución del SDK depende de `android/local.properties` o de tu shell. El script de install de release en particular **no va a encontrar `adb` en macOS** por esa rama.

---

## 9. Comandos, env y tests

### Scripts principales
`android` · `android:install` · `android:demo` · `android:release` (= `:apk` + `:install`) · `start` (Metro atado a la IP LAN) · `start:demo` · `metro:host` · `lint` (`eslint .`) · `test` (jest) · `storybook` / `storybook:android` · `mail:test`.

### Env — las que importan

| Var | Efecto |
|---|---|
| `KIOSK_API_USE_MOCK` | **el único switch de mock**; también gobierna `createEcrClient`, el serial del dispositivo y el catalog sync |
| `KIOSK_API_BASE_URL` / `KIOSK_UPLOADS_BASE_URL` / `KIOSK_API_KEY` | conexión al backend |
| `KIOSK_DEMO_MODE` / `_SCENARIO` / `_REFERENCE_CODE` / `_SHORT_TIMEOUTS` | la capa demo, **sin** forzar mock |
| `KIOSK_DEVICE_SERIAL_OVERRIDE` | pisa el serial de hardware sin condiciones |
| `KIOSK_FISCAL_SERVICE_URL` | base de HkaApp, default `http://127.0.0.1:8765` |
| `KIOSK_FISCAL_MOCK` / `KIOSK_PRINTER_MOCK` | mocks de periféricos |
| `KIOSK_TRACK_BASE_URL` | QR del ticket → `{origin}/track/{shortCode}` |
| `KIOSK_ADMIN_PASSCODE` | gate del dashboard admin |
| `KIOSK_POS_TEST_CHARGE_VES` | fuerza un monto de prueba al terminal |
| `KIOSK_MAIL_*` + `KIOSK_SETTLEMENT_EXCEL_MAIL` | SMTP opcional tras el settlement |
| `ENVFILE` | selecciona `.env` vs `.env.demo` |

### Tests
141 archivos. `__mocks__/react-native-config.js` **no define `KIOSK_API_USE_MOCK`**, así que en tests `shouldUseMockApi()` es `false` por defecto.

`jest.setup.js` mockea globalmente: AsyncStorage, op-sqlite (la BD en memoria escrita a mano), `react-native-qrcode-svg`, `react-native-device-info`, `react-native-blob-util`, **y `@shared/session`**.

⚠️ **Ese mock de `@shared/session` está desactualizado.** Solo exporta `KioskSessionProvider`, `useKioskSession`, `useKioskBootstrap`, `useKioskAppearance`, `useKioskOrganization`, `bootstrapKioskSession`. O sea que en tests **`KioskOrderSessionBridge`, `useKioskPricing`, `useBcvExchangeRate`, `startKioskCatalogSync` y `KioskBootstrapLoadingScreen` son `undefined`**, y 17 archivos importan `useKioskPricing`/`useBcvExchangeRate` de ahí. `__tests__/App.test.tsx` pasa, pero está renderizando un árbol donde `KioskOrderSessionBridge` no existe — **no es el stack real de providers**. No hay un solo `jest.unmock` en el repo. Este es el arreglo de mayor valor en el setup de tests.

---

## 10. Docs que mienten (verificado contra el código)

- **`KIOSK_DEMO_MODE` no fuerza mock.** El `README.md` ("*`KIOSK_DEMO_MODE=true` **always** forces mock API (feria-safe)*") y el `CLAUDE.md` dicen lo contrario que `src/shared/config/api.ts`, cuyo propio comentario aclara que no.
- **El `.env.demo` committeado tiene `KIOSK_API_USE_MOCK=false`** y apunta a `http://10.182.5.14:3000`. O sea que `npm run android:demo` hoy corre la capa demo contra un backend **vivo** en LAN, no contra fixtures offline — exactamente lo contrario de lo que promete el README. También committea `KIOSK_ADMIN_PASSCODE=123456`.
- **`docs/usb-pos-transaccion.md` tiene todas las rutas mal.** Cita `com/keiver/pacheco/conviasa/UsbSerialModule.kt`, `hooks/useUsbECR.ts`, `components/PaymentModal.tsx`, `app/screens/PaymentScreen.tsx`, `utils/recoveryQueue.ts` — **ninguno existe acá**; `conviasa` es el paquete de un proyecto predecesor y aparece solo en ese doc. **La descripción del protocolo sí es correcta** (115200-8-N-1, detección por VID/PID, sleep de 300 ms, `extractLastBalancedJson`, `sendAndWait` de 120 s, el filtro de `result: -97`). Serví de referencia de protocolo; ignorá cada ruta.
- `README.md` linkea `docs/KIOSK_DEVELOPER_GUIDE.md`, `docs/ECR_NATIVE_MODULE.md` y `../docs/SELF_SERVICE_KIOSK_FLUX.md` — **los tres faltan**. La guía del kiosco real vive en `../Midaz-W-Backend/KIOSK_DEVELOPER_GUIDE.md`.
- `CLAUDE.md` ubica el código de serial en `src/shared/peripherals/device/`; está en `src/shared/device/`.
- `.cursor/rules/midaz-atlas-app-kiosk-order.mdc` dice que `KioskOrderProvider` se monta en `App.tsx`; lo monta `KioskOrderSessionBridge`, y sus globs apuntan a un prefijo `MidazAtlasApp/**` que no existe.

---

## 11. Deudas y código muerto

1. **`getCheckoutSnapshot()` se descarta** (`AppNavigator.tsx:66`) — el contrato de congelar totales no está aplicado.
2. **El mock de `@shared/session` en jest está desactualizado** (§9).
3. **`console.log` de un payload de pago en producción**: `src/shared/api/kiosk/pagoMovilAccount.ts:37-39,54` loguea el request completo del QR de pago móvil (banco, cédula, teléfono, monto) sin guard de `__DEV__`.
4. **`KIOSK_PRINTER_MOCK` no está documentado ni tipado** — se lee en `config/printer.ts` pero falta en `react-native-config.d.ts` y en los dos `.env*.example`.
5. **`KIOSK_QR_GENERATOR_URL` es config muerta** — declarada, defaulteada, con getter, y después ignorada por `getKioskQrGeneratorUrl()`.
6. **`resetKioskSession`'s `flowStep` no se usa** (destructurado como `_flowStep`) pero es obligatorio por tipo.
7. **`NativeEcrClient.checkConnection()` siempre responde por el fallback mock**, nunca por el puerto nativo.
8. **`defaultOrderFiscalConfig` vive en un archivo llamado `mockOrderFiscalConfig.ts`** pero se usa en vivo.
9. **TODOs abiertos:** `HttpKioskApiClient.ts:217` (path de `findCustomerByDocument` sin confirmar con backend) y `src/modules/payment/reference/services/verifyPaymentReference.ts:18`.
10. **23 marcadores `@deprecated` fuera de tests**, entre ellos `useKioskCart`, `CartLine.modifierIds`, `PrimaryButton`, las variantes `Mobile*` de cambio de documento, y varios helpers de modifiers.
11. `PrinterModule2.kt` tiene mojibake en los logs (`crÃ­tico`) — el archivo quedó doble-codificado.

**No verificado:** `ios/` (la app es Android-first); el interior de `parseSettlementData` en `PrinterModule2.kt`; los handlers de transición de `PaymentNavigator.tsx` más allá de la línea ~160.
