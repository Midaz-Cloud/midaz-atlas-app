# Midaz Atlas — nota para agentes

**Empieza por aquí:**
- `docs/DEVELOPER_HANDBOOK.md` — **cómo hago X**: agregar una pantalla a un paso del flujo, una llamada de API, un periférico; la máquina de estados de navegación; el stack de providers; el contrato de orden del kiosco; correr en un equipo desde cero.
- `../docs/ECOSISTEMA.md` — mapa de los 9 repos (si estás tocando más de uno).
- `../Midaz-W-Backend/KIOSK_DEVELOPER_GUIDE.md` — **el contrato del backend contra el que se programa esta app**. No está en este repo (su Addendum 2026-10-17 lista las rutas que la guía original no documenta).
- El resto de este archivo — **por qué esto explotó antes**: el registro de incidentes.

**Cinco cosas que hay que saber antes de tocar nada:**
1. **No hay react-navigation.** La navegación es estado de React + render condicional en dos niveles, y `OrderingNavigator` usa un modelo de capas (`active/parked/unmounted`), no montar y desmontar.
2. **`KIOSK_API_USE_MOCK` es el único switch de mock.** `KIOSK_DEMO_MODE` **no** fuerza mock (solo enciende la capa de demo: banner, escenarios, timers cortos); ver `shouldUseMockApi()` en `src/shared/config/api.ts`.
3. **El `.env.demo` versionado tiene `KIOSK_API_USE_MOCK=false`** y apunta a una IP de la LAN, así que `npm run android:demo` hoy corre contra el backend, no contra el mock. Además trae `KIOSK_ADMIN_PASSCODE` en claro (está en git) — pendiente de decisión del usuario: rotarlo y/o sacarlo del repo.
4. **Primero el cobro, después la orden.** `POST /kiosk/cart/reserve` es obligatorio antes de cualquier cobro, y la orden solo se crea con el pago ya confirmado. La excepción es el modo sin backend, que salta la reserva y encola la venta: ver `docs/KIOSK_OFFLINE_LAN.md`.
5. **`docs/usb-pos-transaccion.md` describe el protocolo USB/ECR correctamente**; su tabla de archivos se corrigió el 2026-10-17 (antes traía rutas de un proyecto predecesor). Si vuelve a divergir del código, manda el código.

---

## Tipos de pedido: la lista manda, el par fijo es solo el fallback
`KioskConfigResponse.orderTypes` viene del panel por sucursal. `null` = par de fábrica (Comer aquí / Para llevar), gateado como siempre por `foodServiceEnabled`; una lista concreta lo reemplaza. `mapConfigToRuntime` resuelve todo en `orderTypeChoices` y `orderTypeSelectionEnabled` pasa a significar "hay 2 o más donde elegir" — con 1 el navigator la auto-aplica y con 0 no se pregunta nada (`IN_STORE`). La etiqueta custom NO se traduce (solo el par de fábrica usa i18n), y la orden viaja con `fulfillment` de la opción elegida, no con el `orderType` derivado, porque dos opciones distintas pueden mapear al mismo dineIn/takeOut. Las HeroSelectionCard son de alto fijo y el layout entra justo con dos (480 de alto + 72 de gap): con 3 se usa `orderTypeCompactLayout` (ratio 2/3, solo eje vertical) para que entren sin scrollear. El panel topea en 3 —web y backend— justamente por eso; subir ese tope exige rehacer este layout primero.

## Incidentes y trampas

### Recovery de pagos POS

Payloads USB reales para tests van en `src/shared/peripherals/ecr/__fixtures__/` (no en `__tests__/`, jest los tomaría como suites). Filas de `failed_payments` tienen ciclo `status` (`open→salvaged→retry_*`); el salvamento/reintento vive en `src/modules/payment/recovery/` y el reintento de orden es solo manual (riesgo de duplicado).

### Docs

`docs/KIOSK_BILLING_VS_PAYMENT_DOCUMENT.md` (factura fiscal vs. documento de pago) y `docs/usb-pos-transaccion.md` (protocolo USB del POS) son los únicos docs de dominio en `docs/`; lo operativo (sin backend, LAN) está en `docs/KIOSK_OFFLINE_LAN.md`. `ECR_NATIVE_MODULE.md` nunca existió: el módulo nativo se describe en el handbook §Periféricos.

### Pendiente: rotar credenciales expuestas (`.env.bak.20260827-dev`)

Ese archivo (commit `cb0b65c`, mergeado a `develop` el 2026-09-01) trae `KIOSK_API_KEY` y `KIOSK_ADMIN_PASSCODE` en texto plano — quedó en la rama `feat/kiosk-order-types`, que hasta esa fecha era solo local y recién se pusheó a GitHub por primera vez. Rotar ambos valores cuando se pueda (no es urgente, repo privado) y, si se quiere sacar el archivo del historial, coordinarlo aparte — reescribir requiere force-push sobre `develop`.

### Salud del equipo y Fase 2 del menú (2026-09-29)

- **Telemetría de proceso** (`src/shared/telemetry/kioskRuntimeHealth.ts`): PSS/heap Hermes/uptime vía `KioskDeviceModule.getProcessMemory` + `HermesInternal.getInstrumentedStats`. Viaja en el heartbeat (`runtime`, whitelisted en gateway y `KioskHeartbeatDto`) y se guarda un historial local de 24 h (`kioskRuntimeHealthHistory.ts`, una toma cada 5 min) visible en admin → "Salud del equipo" (`DeviceHealthScreen`). Si el kiosko "se pone lento tras horas", mirar ahí primero (PSS/heap creciendo vs. `Memoria baja` del sistema) antes de tocar código.
- **Menú virtualizado**: `MenuScreen` es una `FlatList` con solo la categoría elegida montada (`MenuProductRow` memoizada). No volver al patrón de montar todas las categorías con `display: none`: decodificaba el catálogo completo en memoria nativa.
- **Fiscal con timeout**: `FISCAL_TIMEOUTS` en `HttpFiscalClient` (health 5 s, emit 120 s, Z 180 s). HkaApp por su lado hace backoff (10 s → 5 min) en la reconexión Bluetooth cuando la impresora no responde; el health con `probe=enq` (antes de cobrar) es "urgente" y salta esa espera.

### Vínculo por equipo (2026-10-17)

- `POST /auth/kiosk/login` va por `loginKioskWithBinding` (`src/shared/api/kiosk/kioskLogin.ts`, llamado desde `bootstrapKioskSession`): manda `{serialNumber, apiKey, bindingCapable: true, deviceSecret?}` y lee `deviceBinding: { state, deviceSecret? }` con `state` ∈ `enrolled | pending | unbound | unverified | off` (el vinculado es `enrolled`, no existe `bound`).
- **Dónde vive el secreto**: solo en el almacén seguro nativo (`KioskDeviceModule.kt` + `KioskSecureStore.kt`: AndroidKeyStore AES-GCM sobre SharedPreferences privadas), vía `deviceSecretStorage.ts`. Nunca en AsyncStorage: sin módulo nativo, leer da `null` y guardar lanza, y entonces se sigue con el login sin vínculo (el servidor lo volverá a emitir). El token de sesión también va ahí desde esta fecha (`tokenStorage.ts`); en AsyncStorage queda solo el vencimiento. El logout **no** borra el secreto (`clearDeviceSecret` es solo para un borrado explícito).
- **Qué hace la app por estado**: no ramifica por `state`. Si viene `deviceSecret` (caso `pending`) lo guarda y repite el login UNA vez enviándolo, aunque la confirmación no diga `enrolled` ni aunque traiga otro secreto (no se pisa). `unverified`, `off` y estados desconocidos son un login normal: el secreto guardado queda como estaba y no se re-enrola. Un 401 con `code` `DEVICE_SECRET_REQUIRED | DEVICE_SECRET_INVALID | DEVICE_NOT_ENROLLED` sale como `DEVICE_REBIND_MESSAGE` («Restablecer vínculo» en el ERP), sin reintentos. Tests: `src/shared/api/kiosk/__tests__/{kioskLogin,deviceSecretStorage,tokenStorage.secure}.test.ts`.
- **Trampa de tests**: `MenuScreen.test.tsx` lleva `jest.setTimeout(30000)` porque con la caché de transformación fría el primer render carga todo el árbol y pasa de los 5 s por defecto; no es un timeout de la app. Si otra suite de pantalla completa falla solo en el primer `npm test`, es esto.

### Arranque claro y complementos (2026-10-01)

- **Pantalla de arranque fallido** (`src/shared/session/KioskStartupErrorScreen.tsx`): muestra el serial del equipo en grande y un mensaje por causa (401 = no asignado / complemento Kiosko inactivo, 403 = suscripción suspendida, sin código = sin red) y **reintenta sola cada 30 s**. Al asignar el equipo en el Hub entra sin tocar el kiosko. `bootstrapKioskSession` devuelve `statusCode` y `deviceSerial` en `auth_error`.
- **Cédula con el token del kiosko**: `KioskApiClient.lookupCedula` → `GET /kiosk/customers/lookup-cedula` (el gateway resuelve la org por el JWT; la API key ya no viaja en la URL). Si el gateway todavía no tiene la ruta (404 "Cannot GET"), `customerLookup.ts` cae a la ruta pública histórica. Cuando prod tenga la ruta, se puede borrar el respaldo.
- **Builds por ambiente**: `yarn android:release:qa:apk` / `yarn android:release:prod:apk` fijan `ENVFILE` (`.env.qa.local` / `.env.prod.local`). `android:release:apk` a secas usa `.env` (serial de prueba `MDZ-KIOSK-001` y cobro POS de 1 Bs): **no sirve para un equipo real**.
- El alta del kiosko ya no se hace desde la web del ERP: Midaz lo asigna desde el inventario del Hub (complemento "Kiosko", con límite de equipos). Ver plan "Complementos".
