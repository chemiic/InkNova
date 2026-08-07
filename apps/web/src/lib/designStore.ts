const DB_NAME = 'inknova-designs'
const DB_VERSION = 1
const STORE = 'pdfs'

export type DesignPdfRecord = {
  key: string
  blob: Blob
  fileName: string
  createdAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
  })
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () =>
      reject(req.error ?? new Error('indexedDB request failed'))
  })
}

export async function saveDesignPdf(
  key: string,
  blob: Blob,
  fileName: string,
): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const record: DesignPdfRecord = {
      key,
      blob,
      fileName,
      createdAt: Date.now(),
    }
    await reqToPromise(store.put(record))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('indexedDB tx failed'))
    })
  } finally {
    db.close()
  }
}

export async function getDesignPdf(
  key: string,
): Promise<DesignPdfRecord | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const result = await reqToPromise(tx.objectStore(STORE).get(key))
    return (result as DesignPdfRecord | undefined) ?? null
  } finally {
    db.close()
  }
}

export async function deleteDesignPdf(key: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await reqToPromise(tx.objectStore(STORE).delete(key))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('indexedDB tx failed'))
    })
  } finally {
    db.close()
  }
}

export async function deleteDesignPdfs(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => deleteDesignPdf(k)))
}
