# Datos de facturación vs documento de pago (kiosco)

## Resumen

En el flujo de pago del kiosco existen **dos identidades de documento** que no deben confundirse:

| Concepto | Origen | Uso |
|----------|--------|-----|
| **Cliente / facturación** | Paso P8 (búsqueda o registro de cliente) | Orden, factura impresa, `customerId` en `POST /kiosk/orders` |
| **Documento del pagador** | P10 (a) POS, P10 (c) confirmación pago móvil y P10 (d) «Nueva cédula» | Terminal POS, `validate-payment` y `cedula` en la orden |

El cliente puede completar facturación con una cédula (o RIF) y **elegir otro documento** solo para ejecutar el pago móvil si la persona que transfiere no es la misma que la de la factura.

## Flujo en la app

1. **P8 · Cliente** — Se guarda `KioskCustomer` (`documentId`, nombre, teléfono, etc.). Es el titular de facturación.
2. **Localizador** (si aplica) — Mesa / localizador; no altera documentos.
3. **P10 (a) · POS / ECR** (Figma `47:2`) — «Acerca tu tarjeta», monto total, documento asociado al pagador y sincronización con terminal. «Cambiar número de cédula» abre P10 (d). «Continuar» ejecuta el cobro en el POS con el documento de pago.
4. **P10 (b) · Pago móvil y QR** (Figma `48:2`) — Cuenta destino para transferir; «Continuar» pasa a confirmación.
5. **P10 (c) · Confirmar pago móvil** (Figma `205:176`) — Datos de la transferencia del cliente.
6. **P10 (d) · Nueva cédula** (Figma `205:390`) — Pantalla compartida POS / pago móvil para cambiar solo el documento del pagador.
7. **Validación y orden** — `paymentPayerDocumentId` en sesión de orden. La orden sigue ligada al `customerId` de facturación.

## Estado en código

- `useKioskCustomer().customer.documentId` — facturación (impresión, `customerId`).
- `useKioskOrder().paymentPayerDocumentId` — documento para POS y pago móvil; si es `null`, se usa el de facturación hasta que el usuario lo cambie en P10 (d).
- `useKioskOrder().mobilePaymentPayload` — resultado de validación (referencia, banco, `cedula`, teléfono enviados al API).

Ambos estados se limpian en `resetOrder()` al cerrar la sesión del kiosco.

## Diseño Figma

- P10 (a) POS / ECR: nodo `47:2`
- P10 (b) Pago móvil y QR (cuenta destino): nodo `48:2`
- P10 (c) Confirmar pago móvil: nodo `205:176`
- P10 (d) Nueva cédula: nodo `205:390`

## API

- Crear orden: `customerId` del cliente de facturación; datos de factura derivados del cliente registrado.
- Pago móvil: `cedula` y `phone` del formulario de confirmación (documento de pago, no necesariamente el de facturación).
