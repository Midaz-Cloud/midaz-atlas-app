const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NUM = String.raw`\s*-?\d+(?:\.\d+)?%?\s*`;
const RGB = new RegExp(String.raw`^rgba?\(${NUM},${NUM},${NUM}(?:,${NUM})?\)$`, 'i');
const HSL = new RegExp(String.raw`^hsla?\(${NUM}(?:deg)?,${NUM},${NUM}(?:,${NUM})?\)$`, 'i');

/**
 * Color de la config del panel → color que React Native sabe pintar.
 * El panel web guardó más de una vez sus variables CSS por defecto
 * (`hsl(var(--primary))`), que en RN se pintan como transparente: la barra del
 * carrito y la categoría elegida quedaban en blanco (Cochi Crunch, 2026-09-30).
 * Solo se aceptan hex, rgb(a) y hsl(a) numéricos; cualquier otra cosa usa el fallback.
 */
export function sanitizeKioskColor(value: unknown, fallback: string): string;
export function sanitizeKioskColor(value: unknown, fallback: null): string | null;
export function sanitizeKioskColor(value: unknown, fallback: string | null): string | null {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (HEX.test(trimmed) || RGB.test(trimmed) || HSL.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}
