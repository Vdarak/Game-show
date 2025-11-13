"use client"

const DB_NAME = "gameshow-videos"
const STORE_NAME = "videos"
const VIDEO_KEY = "sponsor-video"

let dbInstance: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveVideoToIndexedDB(videoDataUrl: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.put(videoDataUrl, VIDEO_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[VideoStorage] Failed to save video:", error)
    throw error
  }
}

export async function getVideoFromIndexedDB(): Promise<string | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(VIDEO_KEY)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[VideoStorage] Failed to get video:", error)
    return null
  }
}

export async function deleteVideoFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(VIDEO_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[VideoStorage] Failed to delete video:", error)
    throw error
  }
}

export async function hasVideoInIndexedDB(): Promise<boolean> {
  try {
    const video = await getVideoFromIndexedDB()
    return video !== null
  } catch {
    return false
  }
}
