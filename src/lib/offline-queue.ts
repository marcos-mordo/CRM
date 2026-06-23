// Cola local de operaciones offline usando IndexedDB nativo (sin deps).
// Permite a un representante crear ventas sin conexión y sincronizarlas
// automáticamente cuando vuelva online.

export type QueuedOperation = {
  uuid: string;
  type: 'CREATE_SALE';
  payload: any;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

const DB_NAME = 'brandhub-offline';
const STORE_NAME = 'operations';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB no disponible'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'uuid' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    Promise.resolve(fn(store)).then((result) => {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }).catch(reject);
  });
}

export async function enqueue(op: Omit<QueuedOperation, 'createdAt' | 'attempts'>): Promise<void> {
  await tx('readwrite', (store) => {
    store.put({ ...op, createdAt: Date.now(), attempts: 0 });
  });
}

export async function getAll(): Promise<QueuedOperation[]> {
  return tx('readonly', (store) => {
    return new Promise<QueuedOperation[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as QueuedOperation[]);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function remove(uuid: string): Promise<void> {
  await tx('readwrite', (store) => {
    store.delete(uuid);
  });
}

export async function markFailed(uuid: string, error: string): Promise<void> {
  await tx('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.get(uuid);
      req.onsuccess = () => {
        const op = req.result as QueuedOperation | undefined;
        if (!op) return resolve();
        op.attempts = (op.attempts ?? 0) + 1;
        op.lastError = error;
        store.put(op);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function pendingCount(): Promise<number> {
  return tx('readonly', (store) => {
    return new Promise<number>((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
