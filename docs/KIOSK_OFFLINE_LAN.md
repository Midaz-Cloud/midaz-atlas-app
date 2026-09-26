# Kiosko sin conexión y comandas por LAN

Si el kiosko pierde internet o el backend no responde, sigue vendiendo con tarjeta. La comanda le llega a cocina por la red local, y todo se sincroniza solo cuando vuelve la conexión.

## Qué pasa sin backend

| Paso | Con backend | Sin backend |
| --- | --- | --- |
| Arranque | login + config + catálogo en vivo | config y catálogo de la última sesión (caché) |
| Métodos de pago | los configurados | solo tarjeta (POS). Efectivo si `lanAllowCashOffline` |
| Reserva de stock | obligatoria | se salta; el backend descuenta (forzado) al sincronizar |
| Cliente | búsqueda en vivo | caché local; si no está, registro local (se crea al sincronizar) |
| Factura fiscal | HkaApp | HkaApp (igual, es local) |
| Factura digital | backend al registrar | backend al sincronizar, con la fecha del cobro |
| Número de orden | `ORD-…` del backend | local `K{3 últimos del serial}-{0000}` |
| Comanda | backend → Comandera | servidor LAN del kiosko → Comandera |

Un cobro nunca se repite ni se vuelve a emitir su factura. Si el `POST /kiosk/orders` falla por red o 5xx, la venta queda en `order_outbox` y se entrega igual. Si el backend la rechaza con un 4xx, queda `failed` para revisión en **Admin → Ventas por sincronizar** y también se entrega.

## Sincronización

`src/shared/sync/orderSyncWorker.ts` drena la cola FIFO en estos momentos:
- al arrancar;
- al volver la conexión;
- cada 60 s mientras haya pendientes.

Reglas del drenado:
- Cada venta se reenvía con su `clientOrderId` como `Idempotency-Key`, así que un reintento nunca duplica la orden.
- Viaja con `offline: true`, `paidAt` (hora real del cobro), la tasa y los precios que se imprimieron, y el estado que marcó cocina (`comandaStatus`).
- Se pausa mientras un cliente está pagando.

El cierre de lote intenta sincronizar antes. Lo que quede pendiente sale en el ticket bajo "PENDIENTES DE SINCRONIZAR", y los cobros sin orden (`failed_payments` abiertos) ya no se borran.

## Servidor LAN de comandas

Es un módulo nativo (`android/.../lan/`, NanoHTTPD) en `0.0.0.0:8790`. Kotlin solo transporta cada request: la lógica vive en `src/shared/lan/lanComandaRouter.ts`. El servidor está siempre encendido mientras `lanComanda.enabled`, con o sin backend.

**Autenticación:** header `X-Kiosk-Lan-Key: <lanComanda.sharedKey>`, obligatorio salvo en health. El backend genera la clave (`kiosk_configs.lan_shared_secret`).

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/lan/v1/health` | `{ok, kioskSerial, appVersion, kioskOnline, pendingSync, serverTime, lanProtocol: 1}` |
| GET | `/lan/v1/comandas?since=<ISO>` | array con la forma de `GET /comandas` (sin `since`: últimas 48 h) + header `X-Kiosk-Server-Time` (cursor del próximo poll) |
| PATCH | `/lan/v1/comandas/:id/status` `{status}` | fila actualizada; `status` ∈ `pending`, `in_progress`, `ready`; nunca retrocede |

Cada comanda LAN lleva estos campos:
- `id: "local:<clientOrderId>"`, `source: "kiosk"` y `clientOrderId`;
- `shortCode` y `displayOrderNumber` con el número local;
- `order.clientOrderId`.

La Comandera deduplica por `clientOrderId`: la comanda que el backend crea al sincronizar trae el mismo valor en `comanda.order.clientOrderId`, así que no se reimprime.

**Descubrimiento:** el kiosko manda `POST /kiosk/heartbeat {lanIp, appVersion, pendingSync}` al arrancar, cada 5 min y cuando le cambia la IP. La Comandera lee `GET /branches/:id/kiosks/lan` (permiso `READ_ORDERS`), que devuelve la IP, el puerto y la clave de cada kiosko activo. El admin del kiosko muestra su IP y el estado del servidor.

## Requisitos de red en el local

- Kiosko y Comandera en la **misma Wi‑Fi** y sin aislamiento de clientes (AP isolation apagado).
- **Reserva DHCP** para el kiosko: si la IP cambia estando sin internet, la Comandera no se entera hasta que vuelva la conexión (o hasta que se cargue la IP a mano).
- **Hora automática (NTP)** en el kiosko: `paidAt` sale de su reloj.
- La pantalla queda siempre encendida (`FLAG_KEEP_SCREEN_ON`): con la app suspendida el servidor no responde.

## Probarlo

1. `pm2 stop api-gateway` y reabrir el kiosko: arranca con el badge "Sin conexión".
2. Vender con tarjeta. Resultado esperado: factura de HkaApp, ticket `K001-0001` con la nota de venta sin conexión, y una fila `queued` en `order_outbox`.
3. `curl -H "X-Kiosk-Lan-Key: <clave>" http://<ip-kiosko>:8790/lan/v1/comandas` devuelve la comanda.
4. `pm2 start api-gateway`. En ≤30 s el worker sincroniza y en la BD la orden queda con `clientOrderId`, `kioskLocalNumber` y `paidAt`.
