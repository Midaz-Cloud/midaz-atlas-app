import { getKioskSqliteDb } from './sqliteDb';
import { rowNumber, rowString } from './rowValues';
import type { LocalCustomerRecord } from './types';

function mapRow(row: Record<string, unknown>): LocalCustomerRecord {
  return {
    documentId: rowString(row.document_id) ?? '',
    firstName: rowString(row.first_name) ?? '',
    lastName: rowString(row.last_name) ?? '',
    phone: rowString(row.phone) ?? '',
    email: rowString(row.email),
    backendId: rowNumber(row.backend_id),
    createdAt: rowString(row.created_at) ?? '',
    updatedAt: rowString(row.updated_at) ?? '',
  };
}

/**
 * Guarda o actualiza un cliente en el kiosko. Un `backendId` ya conocido no se
 * pisa con null: registrar offline a alguien que el kiosko ya vio en línea
 * conserva su id del backend.
 */
export async function upsertLocalCustomer(customer: {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  backendId?: number | null;
}): Promise<void> {
  const db = await getKioskSqliteDb();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO local_customers (document_id, first_name, last_name, phone, email, backend_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(document_id) DO UPDATE SET
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       phone = excluded.phone,
       email = COALESCE(excluded.email, local_customers.email),
       backend_id = COALESCE(excluded.backend_id, local_customers.backend_id),
       updated_at = excluded.updated_at;`,
    [
      customer.documentId,
      customer.firstName,
      customer.lastName,
      customer.phone,
      customer.email ?? null,
      customer.backendId ?? null,
      now,
      now,
    ],
  );
}

export async function findLocalCustomer(documentId: string): Promise<LocalCustomerRecord | null> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(`SELECT * FROM local_customers WHERE document_id = ?;`, [
    documentId,
  ]);
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}
