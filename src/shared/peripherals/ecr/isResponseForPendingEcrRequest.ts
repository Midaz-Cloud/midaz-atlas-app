export type PendingEcrRequest = {
  referenceNo: string;
  type: string;
};

function readJsonString(payload: string, key: string): string | undefined {
  const match = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`).exec(payload);
  return match?.[1];
}

/**
 * PKUSB replies echo the request's `referenceNo` and `type`. The native side can
 * deliver the same reply twice (onUsbCommandReceived + onUsbLineReceived), so a
 * late copy of a `version` reply would otherwise settle the next `payment` as
 * approved (`success:true, result:0`) while the terminal is still waiting for
 * the card. Only reject when a differing value is actually readable: damaged
 * USB payloads without those fields keep settling as before.
 */
export function isResponseForPendingEcrRequest(
  payload: string,
  pending: PendingEcrRequest,
): boolean {
  const referenceNo = readJsonString(payload, 'referenceNo');
  if (referenceNo != null && referenceNo !== pending.referenceNo) {
    return false;
  }
  const type = readJsonString(payload, 'type');
  if (type != null && type !== pending.type) {
    return false;
  }
  return true;
}
