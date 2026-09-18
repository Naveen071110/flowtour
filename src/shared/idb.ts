import { APP_CONFIG } from './constants';

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // IndexedDB is supported in Extension pages, side panels, and Service Workers (Chrome 109+)
    if (typeof indexedDB === 'undefined') {
      reject(new Error("IndexedDB is not supported in this context"));
      return;
    }

    const request = indexedDB.open(APP_CONFIG.IDB.DB_NAME, APP_CONFIG.IDB.VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(APP_CONFIG.IDB.STORE_NAME)) {
        db.createObjectStore(APP_CONFIG.IDB.STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Converts a data URL to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const byteCharacters = atob(parts[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Converts a Blob to a base64 Data URL (used on demand for exports)
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Stores a raw binary screenshot Blob in IndexedDB.
 * Awaits tx.oncomplete to guarantee data is safely committed to disk before resolving.
 */
export async function saveScreenshotBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.IDB.STORE_NAME, 'readwrite');
    const store = tx.objectStore(APP_CONFIG.IDB.STORE_NAME);
    const req = store.put(blob, id);
    req.onerror = () => reject(req.error || new Error(`Failed to put blob for screenshot ${id}`));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(`Transaction error saving screenshot ${id}`));
    tx.onabort = () => reject(tx.error || new Error(`Transaction aborted saving screenshot ${id}`));
  });
}

/**
 * Stores a screenshot by key/ID and Data URL, ensuring transaction commits to disk before resolving.
 * Returns the saved screenshot ID key so it is never undefined or null.
 */
export async function saveScreenshot(id: string, dataUrl: string): Promise<string> {
  if (!id || !dataUrl) {
    throw new Error(`Invalid screenshot save arguments: id=${id}, dataUrl length=${dataUrl?.length ?? 0}`);
  }
  const blob = dataUrlToBlob(dataUrl);
  await saveScreenshotBlob(id, blob);
  return id;
}

/**
 * Stores a Data URL screenshot by converting it into a compressed Blob first
 */
export async function saveScreenshotDataUrl(id: string, dataUrl: string): Promise<string> {
  return saveScreenshot(id, dataUrl);
}

/**
 * Retrieves a screenshot Blob by ID
 */
export async function getScreenshotBlob(id: string): Promise<Blob | null> {
  if (!id || typeof id !== 'string' || id.trim() === '') return null;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.IDB.STORE_NAME, 'readonly');
    const store = tx.objectStore(APP_CONFIG.IDB.STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      resolve((req.result as Blob) || null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a screenshot Blob by ID (alias for getScreenshotBlob)
 */
export async function getScreenshot(id: string): Promise<Blob | null> {
  return getScreenshotBlob(id);
}

/**
 * Retrieves a screenshot as a Data URL
 */
export async function getScreenshotDataUrl(id: string): Promise<string | null> {
  const blob = await getScreenshotBlob(id);
  if (!blob) return null;
  return blobToDataUrl(blob);
}

/**
 * Deletes a screenshot by ID
 */
export async function deleteScreenshot(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.IDB.STORE_NAME, 'readwrite');
    const store = tx.objectStore(APP_CONFIG.IDB.STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Batch deletes screenshots
 */
export async function deleteScreenshots(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.IDB.STORE_NAME, 'readwrite');
    const store = tx.objectStore(APP_CONFIG.IDB.STORE_NAME);
    for (const id of ids) {
      if (id) store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns all screenshot keys currently in IndexedDB
 */
export async function getAllScreenshotKeys(): Promise<string[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.IDB.STORE_NAME, 'readonly');
    const store = tx.objectStore(APP_CONFIG.IDB.STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      resolve((req.result as string[]) || []);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Garbage collector: deletes any screenshot Blobs in IndexedDB
 * that do not belong to any active step in any saved demo.
 */
export async function cleanupOrphanedScreenshots(activeScreenshotIds: string[]): Promise<number> {
  const allKeys = await getAllScreenshotKeys();
  const activeSet = new Set(activeScreenshotIds.filter(Boolean));
  const orphans = allKeys.filter(key => !activeSet.has(key));

  if (orphans.length > 0) {
    await deleteScreenshots(orphans);
    console.log(`[FlowTour IDB GC] Cleaned up ${orphans.length} orphaned screenshot Blobs.`);
  }

  return orphans.length;
}
