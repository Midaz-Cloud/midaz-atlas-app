/** Raw `modifierGroups` from GET /kiosk/products (dev — inspect unmapped API fields). */
let rawModifierGroupsByApiId = new Map<number, unknown>();

export function setRawModifierGroupsByApiId(entries: Map<number, unknown>): void {
  rawModifierGroupsByApiId = new Map(entries);
}

export function getRawModifierGroupsByApiId(apiProductId: number): unknown | undefined {
  return rawModifierGroupsByApiId.get(apiProductId);
}

/** Indexes modifierGroups from the live products response body before mapping. */
export function indexRawModifierGroupsFromProductsBody(body: unknown): void {
  if (!Array.isArray(body)) {
    return;
  }

  const entries = new Map<number, unknown>();
  for (const row of body) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const record = row as Record<string, unknown>;
    const apiProductId = Number(record.id);
    if (!Number.isFinite(apiProductId) || record.modifierGroups == null) {
      continue;
    }
    entries.set(apiProductId, record.modifierGroups);
  }
  setRawModifierGroupsByApiId(entries);
}
