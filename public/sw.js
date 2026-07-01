/* BrandHub Service Worker · offline-first robusto
 *
 * Estrategias:
 * - Estáticos (_next, /icons, fonts) → Cache-first con stale-while-revalidate
 * - GET API → Network-first con fallback a cache (ofrece datos viejos si no hay red)
 * - POST/PUT/DELETE API → Network-only, si falla encola en IndexedDB (sync queue)
 * - Navegación (HTML) → Network-first con fallback a offline.html
 *
 * Background sync: cuando vuelve la conexión, reenvía las mutaciones en cola.
 */

const VERSION = 'brandhub-v3';
const STATIC = `${VERSION}-static`;
const API = `${VERSION}-api`;
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/offline.html',
  '/manifest.json',
  '/logo.svg',
];

// =========================================
// Install / Activate
// =========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      ),
      self.clients.claim(),
    ])
  );
});

// =========================================
// Fetch handler
// =========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo gestionamos mismo origen
  if (url.origin !== self.location.origin) return;

  // GET de API → network-first con cache fallback
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Mutaciones API → network-only, encolar si falla
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    event.respondWith(networkWithQueue(request));
    return;
  }

  // Navegación → network-first, fallback offline.html
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Estáticos (_next/static, /icons, fonts) → cache-first SWR
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(woff2?|png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    event.respondWith(staleWhileRevalidate(request, STATIC));
    return;
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstApi(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(API);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      // Marca header para que el cliente sepa que es cache
      const headers = new Headers(cached.headers);
      headers.set('X-Served-By', 'sw-cache');
      return new Response(cached.body, { status: cached.status, headers });
    }
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkWithQueue(request) {
  try {
    return await fetch(request.clone());
  } catch {
    // Sin red: clona body y encola
    await queueMutation(request);
    return new Response(
      JSON.stringify({ queued: true, message: 'Sin conexión. Tu cambio se enviará cuando recuperes red.' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function navigationStrategy(request) {
  try {
    const res = await fetch(request);
    return res;
  } catch {
    const cache = await caches.open(STATIC);
    return (await cache.match(OFFLINE_URL)) || new Response('Sin conexión', { status: 503 });
  }
}

// =========================================
// IndexedDB queue para mutaciones offline
// =========================================
const DB_NAME = 'brandhub-sync';
const STORE = 'mutations';

function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function queueMutation(request) {
  const body = await request.clone().text();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body,
      queuedAt: Date.now(),
    });
    tx.oncomplete = () => {
      notifyClients({ type: 'queued' });
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function drainQueue() {
  const db = await openDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  let sent = 0;
  let failed = 0;
  for (const it of items) {
    try {
      const res = await fetch(it.url, {
        method: it.method,
        headers: new Headers(it.headers),
        body: it.body,
      });
      if (res.ok || res.status < 500) {
        await deleteItem(db, it.id);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  if (sent > 0) notifyClients({ type: 'synced', sent, failed });
  return { sent, failed };
}

function deleteItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function notifyClients(msg) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((c) => c.postMessage(msg));
  });
}

// =========================================
// Background sync (Chromium) + fallback online event
// =========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'brandhub-sync') {
    event.waitUntil(drainQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'sync-now') {
    event.waitUntil(drainQueue());
  }
  if (event.data?.type === 'skipWaiting') {
    self.skipWaiting();
  }
});

// =========================================
// Push notifications
// =========================================
self.addEventListener('push', (event) => {
  let data = { title: 'BrandHub', body: 'Nueva notificación', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: data.tag,
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
