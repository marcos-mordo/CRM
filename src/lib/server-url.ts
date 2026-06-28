/**
 * Gestiona la URL del servidor BrandHub que la app usa.
 *
 * Lógica:
 * 1. Si window.location.host es un dominio web (vercel/render/dominio propio),
 *    usamos esa misma URL → no hay nada que configurar.
 * 2. Si es la app nativa (Capacitor/Electron), buscamos en localStorage.
 * 3. Si no hay, redirigimos a /server-setup para que el usuario la introduzca.
 */

const KEY = 'brandhub_server_url';

export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function getServerUrl(): string | null {
  if (typeof window === 'undefined') return null;
  // Si estamos en web real (no capacitor), usamos el origin actual
  if (!isCapacitorApp() && window.location.protocol.startsWith('http')) {
    return window.location.origin;
  }
  // Capacitor: leer de localStorage
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  // Sanitiza: quita trailing slash y asegura https/http
  let clean = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
  localStorage.setItem(KEY, clean);
}

export function clearServerUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

/**
 * Comprueba si una URL responde a /api/health.
 */
export async function pingServer(url: string): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const cleanUrl = url.replace(/\/+$/, '');
  const start = Date.now();
  try {
    const res = await fetch(`${cleanUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - start;
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, latencyMs: ms };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'connection failed' };
  }
}
