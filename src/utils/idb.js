const DB_NAME = 'unibus'
const DB_VERSION = 1
const STORE_NAME = 'favouriteStops'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'code' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function run(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = action(tx.objectStore(STORE_NAME))
        tx.onerror = () => reject(tx.error)
        tx.oncomplete = () => resolve(request?.result)
      }),
  )
}

export function getAllFavourites() {
  return run('readonly', (store) => store.getAll())
}

export function putFavourite(stop) {
  return run('readwrite', (store) => store.put(stop))
}

export function deleteFavourite(code) {
  return run('readwrite', (store) => store.delete(code))
}
