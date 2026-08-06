/**
 * Smoke-test KIOSK_MAIL_* SMTP settings from .env
 *
 * Usage:
 *   node scripts/testSmtpMail.js
 *   node scripts/testSmtpMail.js alex1812r@yopmail.com
 *   npm run mail:test
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '..', '.env');
const DEFAULT_TO = 'alex1812r@yopmail.com';

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
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = stripQuotes(trimmed.slice(eq + 1));
    env[key] = value;
  }
  return env;
}

function requireMailConfig(env) {
  const host = env.KIOSK_MAIL_HOST;
  const port = Number.parseInt(env.KIOSK_MAIL_PORT || '465', 10);
  const user = env.KIOSK_MAIL_USERNAME;
  const pass = env.KIOSK_MAIL_PASSWORD;
  const fromAddress = env.KIOSK_MAIL_FROM_ADDRESS || user;
  const fromName = env.KIOSK_MAIL_FROM_NAME || 'Panel Disglobal';
  const encryption = (env.KIOSK_MAIL_ENCRYPTION || 'ssl').toLowerCase();

  const missing = [];
  if (!host) missing.push('KIOSK_MAIL_HOST');
  if (!user) missing.push('KIOSK_MAIL_USERNAME');
  if (!pass) missing.push('KIOSK_MAIL_PASSWORD');
  if (missing.length) {
    throw new Error(`Faltan variables en .env: ${missing.join(', ')}`);
  }

  const secure = encryption === 'ssl' || port === 465;

  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure,
    user,
    pass,
    from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
    encryption,
  };
}

async function main() {
  const to = (process.argv[2] || DEFAULT_TO).trim();
  if (!to.includes('@')) {
    throw new Error(`Destinatario inválido: ${to}`);
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    throw new Error(
      'Falta nodemailer. Instálalo con: npm install --no-save nodemailer',
    );
  }

  const env = loadEnvFile(ENV_PATH);
  const mail = requireMailConfig(env);

  console.log('[testSmtpMail] Configuración (sin password):');
  console.log(`  host:       ${mail.host}`);
  console.log(`  port:       ${mail.port}`);
  console.log(`  secure:     ${mail.secure} (${mail.encryption})`);
  console.log(`  user:       ${mail.user}`);
  console.log(`  from:       ${mail.from}`);
  console.log(`  to:         ${to}`);

  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: {
      user: mail.user,
      pass: mail.pass,
    },
    tls: {
      // Algunos servidores corporativos usan certs intermedios/self-signed.
      rejectUnauthorized: false,
    },
  });

  console.log('[testSmtpMail] Verificando SMTP...');
  await transporter.verify();
  console.log('[testSmtpMail] SMTP OK (verify)');

  const sentAt = new Date().toISOString();
  const info = await transporter.sendMail({
    from: mail.from,
    to,
    subject: `[Midaz Atlas] Prueba SMTP ${sentAt}`,
    text: [
      'Correo de prueba SMTP desde MidazAtlasApp.',
      '',
      `Fecha: ${sentAt}`,
      `Host: ${mail.host}:${mail.port}`,
      `From: ${mail.from}`,
      `To: ${to}`,
    ].join('\n'),
    html: `
      <p><strong>Correo de prueba SMTP</strong> desde MidazAtlasApp.</p>
      <ul>
        <li>Fecha: ${sentAt}</li>
        <li>Host: ${mail.host}:${mail.port}</li>
        <li>From: ${mail.from}</li>
        <li>To: ${to}</li>
      </ul>
    `,
  });

  console.log('[testSmtpMail] Correo enviado');
  console.log(`  messageId: ${info.messageId || '(sin id)'}`);
  console.log(`  response:  ${info.response || '(sin response)'}`);
  if (Array.isArray(info.accepted) && info.accepted.length) {
    console.log(`  accepted:  ${info.accepted.join(', ')}`);
  }
  if (Array.isArray(info.rejected) && info.rejected.length) {
    console.log(`  rejected:  ${info.rejected.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('[testSmtpMail] ERROR:', err.message || err);
  process.exitCode = 1;
});
