import { NativeModules } from 'react-native';

import { getKioskMailConfig } from '@shared/config';

import {
  buildSettlementExcelFile,
  type BuildSettlementWorkbookParams,
  type SettlementExcelFileResult,
} from './buildSettlementWorkbook';

type MailSmtpNativeModule = {
  sendMail(options: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromAddress: string;
    fromName?: string;
    to: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    attachments?: Array<{ path: string; name: string }>;
  }): Promise<boolean>;
};

function getMailSmtpModule(): MailSmtpNativeModule {
  const mod = NativeModules.MailSmtpModule as MailSmtpNativeModule | undefined;
  if (!mod?.sendMail) {
    throw new Error(
      'MailSmtpModule no está disponible. Recompila la app nativa (release/debug).',
    );
  }
  return mod;
}

export type SendSettlementMailParams = BuildSettlementWorkbookParams & {
  /** Override recipient (defaults to KIOSK_MAIL_TO). */
  to?: string;
};

export type SendSettlementMailResult = {
  to: string;
  fileName: string;
  path: string;
};

function buildMailCopy(params: SendSettlementMailParams, fileName: string) {
  const serial = params.settlementData.deviceSerial?.trim() || 'POS';
  const ref = params.referenceNo?.trim() || params.settlementData.referenceNumber || '';
  const subject = `Cierre de lote ${ref || fileName} — ${serial}`;
  const txCount = params.transactions?.length ?? 0;
  const bodyText = [
    'Cierre de lote Midaz Atlas',
    '',
    `Referencia: ${ref || 'N/D'}`,
    `Serial POS: ${serial}`,
    `Estado: ${params.approved ? 'EXITOSO' : 'FALLIDO'}`,
    `Transacciones locales: ${txCount}`,
    '',
    'Detalle en el Excel adjunto (hojas Resumen y Transacciones).',
  ].join('\n');
  const bodyHtml = `
    <p><strong>Cierre de lote Midaz Atlas</strong></p>
    <ul>
      <li>Referencia: ${ref || 'N/D'}</li>
      <li>Serial POS: ${serial}</li>
      <li>Estado: ${params.approved ? 'EXITOSO' : 'FALLIDO'}</li>
      <li>Transacciones locales: ${txCount}</li>
    </ul>
    <p>Detalle en el Excel adjunto (hojas <em>Resumen</em> y <em>Transacciones</em>).</p>
  `;
  return { subject, bodyText, bodyHtml, serial, ref };
}

/** Builds the settlement Excel only (no SMTP). */
export async function generateSettlementExcelDocument(
  params: BuildSettlementWorkbookParams,
): Promise<SettlementExcelFileResult> {
  return buildSettlementExcelFile(params);
}

/** Sends an already-generated settlement Excel via SMTP. */
export async function sendSettlementExcelDocument(
  params: SendSettlementMailParams & SettlementExcelFileResult,
): Promise<SendSettlementMailResult> {
  const config = getKioskMailConfig();
  if (!config) {
    throw new Error(
      'Falta configuración SMTP. Define KIOSK_MAIL_HOST, USERNAME, PASSWORD y KIOSK_MAIL_TO en .env y recompila.',
    );
  }

  const to = params.to?.trim() || config.to;
  const { subject, bodyText, bodyHtml } = buildMailCopy(params, params.fileName);
  const smtp = getMailSmtpModule();
  await smtp.sendMail({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: config.pass,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
    to,
    subject,
    bodyText,
    bodyHtml,
    attachments: [{ path: params.path, name: params.fileName }],
  });

  return { to, fileName: params.fileName, path: params.path };
}

/** Generate Excel then send by email (Home test button / one-shot). */
export async function sendSettlementMail(
  params: SendSettlementMailParams,
): Promise<SendSettlementMailResult> {
  const file = await generateSettlementExcelDocument(params);
  return sendSettlementExcelDocument({ ...params, ...file });
}
