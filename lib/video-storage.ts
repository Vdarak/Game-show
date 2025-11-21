"use client"

const DB_NAME = "gameshow-data"
const STORE_NAME = "videos"
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      // Ensure game-state store exists too
      if (!db.objectStoreNames.contains("game-state")) {
        db.createObjectStore("game-state")
      }
    }
  })
}

// Convert base64 to Blob for more efficient storage
function base64ToBlob(base64: string): Blob {
  const arr = base64.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'video/mp4'
  const bstr = atob(arr[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}

// Convert Blob back to data URL
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function saveVideoToIndexedDB(videoDataUrl: string): Promise<void> {
  try {
    console.log("[VideoStorage] Starting save, base64 length:", videoDataUrl.length, "bytes")
    
    // Convert base64 to blob for more efficient storage
    const blob = base64ToBlob(videoDataUrl)
    console.log("[VideoStorage] Converted to blob, size:", blob.size, "bytes")
    
    const db = await openDB()
    console.log("[VideoStorage] DB opened successfully")
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      console.log("[VideoStorage] Creating put request for blob...")
      const request = store.put(blob, VIDEO_KEY)
      
      request.onsuccess = () => {
        console.log("[VideoStorage] Request onsuccess fired")
      }
      
      request.onerror = () => {
        console.error("[VideoStorage] Request error:", request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        console.log("[VideoStorage] Transaction completed successfully, blob stored")
        resolve()
      }

      transaction.onerror = () => {
        console.error("[VideoStorage] Transaction error:", transaction.error)
        reject(transaction.error)
      }

      transaction.onabort = () => {
        console.error("[VideoStorage] Transaction aborted")
        reject(new Error("Transaction aborted"))
      }
    })
  } catch (error) {
    console.error("[VideoStorage] Failed to save video:", error)
    throw error
  }
}

export async function getVideoFromIndexedDB(): Promise<string | null> {
  try {
    console.log("[VideoStorage] Getting video from IndexedDB...")
    const db = await openDB()
    console.log("[VideoStorage] DB opened for read")
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(VIDEO_KEY)
      request.onsuccess = async () => {
        console.log("[VideoStorage] Get request succeeded, result exists:", !!request.result)
        if (request.result) {
          const blob = request.result as Blob
          console.log("[VideoStorage] Blob retrieved, size:", blob.size)
          // Convert blob back to data URL
          const dataUrl = await blobToBase64(blob)
          console.log("[VideoStorage] Converted back to data URL, length:", dataUrl.length)
          resolve(dataUrl)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => {
        console.error("[VideoStorage] Get request error:", request.error)
        reject(request.error)
      }
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
