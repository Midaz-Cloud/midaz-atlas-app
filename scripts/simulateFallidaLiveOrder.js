/**
 * Ejercicio QA: JSON USB dañado (fallidas) → buildPosPaymentFromEcr → orden real.
 *
 * Usage:
 *   node scripts/simulateFallidaLiveOrder.js
 *   node scripts/simulateFallidaLiveOrder.js --line=2
 *   node scripts/simulateFallidaLiveOrder.js --product=1997
 *
 * Env (.env): KIOSK_API_BASE_URL, KIOSK_API_KEY
 * Defaults: serial AF910S20250915020, producto 1996 (Atamel 1.00 VES).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const FALLIDAS_PATH = path.join(ROOT, 'docs', 'fallidas.txt');
const TMP_DIR = path.join(__dirname, '.tmp');
const POS_OUT = path.join(TMP_DIR, 'fallida-pos-payload.json');
const HELPER_TEST =
  'src/shared/api/kiosk/mappers/__tests__/emitFallidaPosPayment.helper.test.ts';

const DEFAULT_SERIAL = 'AF910S20250915020';
const DEFAULT_PRODUCT_ID = 1996;
const DEFAULT_DOCUMENT = 'V26728807';

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró ${filePath}`);
  }
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq).trim()] = stripQuotes(trimmed.slice(eq + 1));
  }
  return env;
}

function parseArgs(argv) {
  const out = { line: 1, productId: DEFAULT_PRODUCT_ID, serial: DEFAULT_SERIAL };
  for (const arg of argv) {
    const m = arg.match(/^--(\w+)=(.+)$/);
    if (!m) continue;
    if (m[1] === 'line') out.line = Number.parseInt(m[2], 10);
    if (m[1] === 'product') out.productId = Number.parseInt(m[2], 10);
    if (m[1] === 'serial') out.serial = m[2];
    if (m[1] === 'document') out.document = m[2];
  }
  out.document = out.document || DEFAULT_DOCUMENT;
  return out;
}

function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const payload = body != null ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers: {
          Accept: 'application/json',
          ...headers,
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          let parsed = null;
          if (data) {
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data;
            }
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function nowParts(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const MM = pad2(d.getMinutes());
  const SS = pad2(d.getSeconds());
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${HH}:${MM}:${SS}`,
    timeCompact: `${HH}${MM}${SS}`,
    originalDate: `${mm}${dd}`,
    timestamp: d.toISOString(),
    epoch: d.getTime(),
  };
}

/**
 * Parchea el raw USB manteniendo typos de claves; solo cambia monto, fechas y refs únicas.
 */
function patchFallidaRaw(raw, { amountCents, now }) {
  let text = raw;
  const uniq = String(now.epoch).slice(-6);
  const rrn = `9${String(now.epoch).slice(-11)}`.slice(0, 12);
  const refNum = String(100000 + (now.epoch % 900000)).slice(-6);
  const trace = String(200000 + (now.epoch % 700000)).slice(-6);
  const referenceNo = `REF-LIVE-${now.epoch}-${uniq}`;

  text = text.replace(/"amount"\s*:\s*\d+/i, `"amount":${amountCents}`);
  text = text.replace(/"amou7nt"\s*:\s*\d+/i, `"amou7nt":${amountCents}`);
  text = text.replace(/"amount"\s*:\s*"[^"]*"/i, `"amount":"${amountCents}"`);

  text = text.replace(/"date"\s*:\s*"[^"]*"/i, `"date":"${now.date}"`);
  text = text.replace(/"timestamp"\s*:\s*"[^"]*"/i, `"timestamp":"${now.timestamp}"`);
  text = text.replace(/"time"\s*:\s*"[^"]*"/i, `"time":"${now.time}"`);
  text = text.replace(/"originalDate"\s*:\s*"[^"]*"/i, `"originalDate":"${now.originalDate}"`);
  text = text.replace(/"originalTime"\s*:\s*"[^"]*"/i, `"originalTime":"${now.timeCompact}"`);

  text = text.replace(/"RRN"\s*:\s*"[^"]*"/i, `"RRN":"${rrn}"`);
  text = text.replace(/"traceNumber"\s*:\s*"[^"]*"/i, `"traceNumber":"${trace}"`);
  text = text.replace(/"referenceNo"\s*:\s*"[^"]*"/i, `"referenceNo":"${referenceNo}"`);

  // Refs tipadas / corruptas: reemplazar valor manteniendo la clave dañada
  text = text.replace(
    /"(referebceNumber|refrerenceNumber|refeencenumber|eferenceNumber|rbeferenceNumer)"\s*:\s*"[^"]*"/i,
    `"$1":"${refNum}"`,
  );

  return {
    raw: text,
    amountCents,
    rrn,
    refNum,
    trace,
    referenceNo,
  };
}

function toEcrCents(price) {
  return Math.round(Number(price) * 100);
}

function emitPosPayloadViaJest({ raw, amountCents, customer, documentId }) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  if (fs.existsSync(POS_OUT)) fs.unlinkSync(POS_OUT);

  const rawPath = path.join(TMP_DIR, 'fallida-raw.json');
  const customerPath = path.join(TMP_DIR, 'fallida-customer.json');
  fs.writeFileSync(rawPath, raw, 'utf8');
  fs.writeFileSync(customerPath, JSON.stringify(customer), 'utf8');

  const env = {
    ...process.env,
    RUN_EMIT_FALLIDA_POS: '1',
    FALLIDA_RAW_PATH: rawPath,
    FALLIDA_AMOUNT_CENTS: String(amountCents),
    FALLIDA_DOCUMENT_ID: documentId,
    FALLIDA_CUSTOMER_PATH: customerPath,
    FALLIDA_POS_OUT: POS_OUT,
  };

  const result = spawnSync(
    'npx',
    [
      'jest',
      '--runTestsByPath',
      HELPER_TEST,
      '--runInBand',
      '--forceExit',
      '--no-coverage',
    ],
    { cwd: ROOT, env, encoding: 'utf8', shell: true },
  );

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(
      `Falló emitFallidaPosPayment helper (exit ${result.status}${result.error ? `, ${result.error.message}` : ''})`,
    );
  }
  if (!fs.existsSync(POS_OUT)) {
    throw new Error(`No se generó ${POS_OUT}`);
  }
  return JSON.parse(fs.readFileSync(POS_OUT, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = loadEnvFile(ENV_PATH);
  const baseUrl = (fileEnv.KIOSK_API_BASE_URL || '').replace(/\/$/, '');
  const apiKey = fileEnv.KIOSK_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('Faltan KIOSK_API_BASE_URL / KIOSK_API_KEY en .env');
  }

  const fallidas = fs
    .readFileSync(FALLIDAS_PATH, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rawOriginal = fallidas[args.line - 1];
  if (!rawOriginal) {
    throw new Error(`No hay línea ${args.line} en fallidas.txt (${fallidas.length} líneas)`);
  }

  console.log('=== 1) Login kiosco ===');
  const login = await requestJson(`${baseUrl}/auth/kiosk/login`, {
    method: 'POST',
    body: { serialNumber: args.serial, apiKey },
  });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`Login falló: ${login.status} ${login.raw?.slice?.(0, 300)}`);
  }
  const token = login.body.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  console.log(`OK serial=${args.serial}`);

  console.log('=== 2) Productos ===');
  const productsRes = await requestJson(`${baseUrl}/kiosk/products`, {
    headers: auth,
  });
  if (productsRes.status !== 200) {
    throw new Error(`Products falló: ${productsRes.status} ${productsRes.raw?.slice?.(0, 300)}`);
  }
  const products = Array.isArray(productsRes.body)
    ? productsRes.body
    : productsRes.body?.products || [];
  const product = products.find((p) => Number(p.id) === args.productId);
  if (!product) {
    throw new Error(
      `Producto ${args.productId} no encontrado. IDs: ${products.map((p) => p.id).join(', ')}`,
    );
  }
  const price = Number(product.price ?? product.basePrice ?? 0);
  const amountCents = toEcrCents(price);
  console.log(
    `OK product=${product.id} "${product.name}" price=${price} → amountCents=${amountCents}`,
  );

  console.log('=== 3) Cliente (lookup / create) ===');
  const doc = args.document;
  const nacionalidad = doc.replace(/\d/g, '') || 'V';
  const cedula = doc.replace(/\D/g, '');
  const lookupUrl =
    `${baseUrl}/customers/lookup-cedula?` +
    new URLSearchParams({
      nacionalidad,
      cedula,
      apiKey,
      serialNumber: args.serial,
    }).toString();
  const lookup = await requestJson(lookupUrl);
  let customer = {
    id: 0,
    documentId: doc,
    firstName: 'Ejercicio',
    lastName: 'FallidaLive',
    phone: '04141234567',
    email: '',
  };

  if (lookup.status === 200 && lookup.body?.id != null) {
    const api = lookup.body;
    customer = {
      id: Number(api.id),
      documentId: `${String(api.typeIdentification || 'V').toUpperCase()}${api.identificationNumber}`,
      firstName: String(api.name || 'Cliente').split(/\s+/)[0] || 'Cliente',
      lastName: String(api.billingName || api.name || 'QA').split(/\s+/).slice(-1)[0] || 'QA',
      phone: api.phoneNumber || '04141234567',
      email: api.email || '',
    };
    console.log(`OK cliente existente id=${customer.id} ${customer.documentId}`);
  } else {
    console.log(`Lookup ${lookup.status} → creando cliente…`);
    const create = await requestJson(`${baseUrl}/customers`, {
      method: 'POST',
      headers: auth,
      body: {
        typeIdentification: nacionalidad,
        identificationNumber: cedula,
        name: 'Ejercicio FallidaLive',
        billingName: 'FallidaLive',
        billingAddressLine1: 'N/A',
        billingCity: 'Caracas',
        billingState: 'DC',
        billingCountry: 'VE',
        contactPerson: '',
        notes: 'simulateFallidaLiveOrder',
        phoneNumber: '04141234567',
      },
    });
    if (create.status < 200 || create.status >= 300 || create.body?.id == null) {
      throw new Error(`Create customer falló: ${create.status} ${create.raw?.slice?.(0, 400)}`);
    }
    customer = {
      id: Number(create.body.id),
      documentId: doc,
      firstName: 'Ejercicio',
      lastName: 'FallidaLive',
      phone: '04141234567',
      email: '',
    };
    console.log(`OK cliente creado id=${customer.id}`);
  }

  console.log(`=== 4) Patch fallida línea ${args.line} ===`);
  const now = nowParts();
  const patched = patchFallidaRaw(rawOriginal, { amountCents, now });
  console.log(
    `amountCents=${patched.amountCents} date=${now.date} RRN=${patched.rrn} ref=${patched.refNum}`,
  );

  console.log('=== 5) buildPosPaymentFromEcr (mapper real vía Jest) ===');
  const emit = emitPosPayloadViaJest({
    raw: patched.raw,
    amountCents,
    customer: {
      documentId: customer.documentId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
    documentId: cedula,
  });
  if (!emit.ok) {
    throw new Error(`Mapper falló: ${emit.message}`);
  }
  const cardPayment = emit.payload;
  console.log(
    `OK posResponse.amount=${cardPayment.posResponse.amount} RRN=${cardPayment.posResponse.RRN} code=${cardPayment.posResponse.responseCode}`,
  );

  console.log('=== 6) Reserve cart ===');
  const reserve = await requestJson(`${baseUrl}/kiosk/cart/reserve`, {
    method: 'POST',
    headers: auth,
    body: { items: [{ productId: Number(product.id), quantity: 1 }], ttlMinutes: 15 },
  });
  if (reserve.status < 200 || reserve.status >= 300) {
    throw new Error(`Reserve falló: ${reserve.status} ${reserve.raw?.slice?.(0, 400)}`);
  }
  const reservationId = reserve.body?.reservationId || undefined;
  console.log(
    `OK allReserved=${reserve.body?.allReserved} reservationId=${reservationId ?? '(null)'}`,
  );

  console.log('=== 7) POST /kiosk/orders (real) ===');
  const orderBody = {
    items: [
      {
        productId: Number(product.id),
        quantity: 1,
        taxRate: 0,
        isExempt: false,
      },
    ],
    fulfillmentType: 'IN_STORE',
    paymentMethod: 'debito',
    customerId: customer.id,
    ...(reservationId ? { reservationId } : {}),
    posResponse: cardPayment.posResponse,
    cardType: cardPayment.cardType,
    cedula: cardPayment.cedula,
    ...(cardPayment.cardHolder ? { cardHolder: cardPayment.cardHolder } : {}),
    ...(cardPayment.phone ? { phone: cardPayment.phone } : {}),
    notes: `Ejercicio fallida live L${args.line} ${now.timestamp}`,
  };

  const order = await requestJson(`${baseUrl}/kiosk/orders`, {
    method: 'POST',
    headers: auth,
    body: orderBody,
  });

  if (order.status < 200 || order.status >= 300) {
    console.error('REQUEST', JSON.stringify(orderBody, null, 2));
    throw new Error(`Create order falló: ${order.status} ${order.raw?.slice?.(0, 800)}`);
  }

  console.log('\n=== RESULTADO ===');
  console.log(
    JSON.stringify(
      {
        ok: true,
        orderId: order.body?.id,
        displayOrderNumber: order.body?.displayOrderNumber,
        shortCode: order.body?.shortCode,
        status: order.body?.status,
        grandTotalVES: order.body?.grandTotalVES,
        currencyCode: order.body?.currencyCode,
        product: { id: product.id, name: product.name, price },
        fallidaLine: args.line,
        pos: {
          amount: cardPayment.posResponse.amount,
          RRN: cardPayment.posResponse.RRN,
          referenceNumber: cardPayment.posResponse.referenceNumber,
          responseCode: cardPayment.posResponse.responseCode,
        },
        customerId: customer.id,
        reservationId: reservationId ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});
