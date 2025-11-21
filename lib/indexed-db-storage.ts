"use client"

const DB_NAME = "gameshow-data"
const GAME_STATE_STORE = "game-state"
const VIDEOS_STORE = "videos"
const GAME_STATE_KEY = "gameshow-state"
const VIDEO_KEY = "sponsor-video"
const DB_VERSION = 4

let dbInstance: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(GAME_STATE_STORE)) {
        db.createObjectStore(GAME_STATE_STORE)
      }
      if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
        db.createObjectStore(VIDEOS_STORE)
      }
    }
  })
}

export async function saveGameStateToIndexedDB<T>(data: T): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([GAME_STATE_STORE], "readwrite")
    const store = transaction.objectStore(GAME_STATE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put(data, GAME_STATE_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[IndexedDBStorage] Failed to save game state:", error)
    throw error
  }
}

export async function getGameStateFromIndexedDB<T>(): Promise<T | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([GAME_STATE_STORE], "readonly")
    const store = transaction.objectStore(GAME_STATE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(GAME_STATE_KEY)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[IndexedDBStorage] Failed to get game state:", error)
    return null
  }
}

export async function deleteGameStateFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([GAME_STATE_STORE], "readwrite")
    const store = transaction.objectStore(GAME_STATE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(GAME_STATE_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[IndexedDBStorage] Failed to delete game state:", error)
    throw error
  }
}

export async function clearAllGameShowData(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([GAME_STATE_STORE], "readwrite")
    const store = transaction.objectStore(GAME_STATE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[IndexedDBStorage] Failed to clear all data:", error)
    throw error
  }
}
