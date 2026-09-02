/**
 * KuroBooth High-Capacity Local Storage using IndexedDB
 * Overcomes the 5MB sessionStorage quota limit for ultra-high-resolution 300DPI photo strips.
 */

const DB_NAME = 'kurobooth_db'
const STORE_NAME = 'results'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** Save high-res strip image data URL to IndexedDB */
export async function saveLocalResult(shareCode: string, dataUrl: string): Promise<boolean> {
  // Always try sessionStorage as immediate fast-path
  try {
    sessionStorage.setItem('kurobooth_result_' + shareCode, dataUrl)
  } catch {
    // Quota exceeded in sessionStorage is expected for high-res images, IndexedDB will handle it
  }

  const db = await openDB()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(dataUrl, shareCode)

      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

/** Retrieve high-res strip image data URL from IndexedDB or sessionStorage */
export async function getLocalResult(shareCode: string): Promise<string | null> {
  // 1. Check sessionStorage first
  try {
    const sessionData = sessionStorage.getItem('kurobooth_result_' + shareCode)
    if (sessionData) return sessionData
  } catch {}

  // 2. Check IndexedDB
  const db = await openDB()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(shareCode)

      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}
