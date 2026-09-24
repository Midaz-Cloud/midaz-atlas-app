import { getKioskApiUrl } from '@shared/config/api';

/**
 * ¿Responde el gateway? Cualquier respuesta HTTP (incluso 404/401) cuenta como
 * "hay backend": lo que importa es que la red y el gateway estén vivos, no que
 * exista un endpoint /health. Solo un timeout o un error de red cuentan como caído.
 */
export async function probeKioskGateway(opts?: { timeoutMs?: number }): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 3000);
  try {
    const response = await fetch(getKioskApiUrl(`/health?_t=${Date.now()}`), {
      method: 'GET',
      signal: controller.signal,
    });
    try {
      await response.arrayBuffer();
    } catch {
      // drenar es best-effort (OkHttp)
    }
    return { ok: true };
  } catch (error) {
    const aborted = (error as { name?: string })?.name === 'AbortError';
    return { ok: false, error: aborted ? 'probe timeout' : String((error as Error)?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}
