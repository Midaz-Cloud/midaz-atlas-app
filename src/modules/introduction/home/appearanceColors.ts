/** Uses API hex when valid; otherwise keeps bundled Home defaults. */
export function appearanceTextColor(
  value: string | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  if (/^#[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}
