import { LazyStore } from '@tauri-apps/plugin-store'

const isTauri = '__TAURI_INTERNALS__' in window

let storePromise: Promise<LazyStore> | null = null

function getStore(): Promise<LazyStore> {
  if (!storePromise) {
    storePromise = Promise.resolve(
      new LazyStore('toolkit.json', { autoSave: false })
    )
  }
  return storePromise
}

export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  if (!isTauri) {
    try {
      const item = localStorage.getItem(`toolkit:${key}`)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  try {
    const store = await getStore()
    const value = await store.get<T>(key)
    return value ?? defaultValue
  } catch {
    return defaultValue
  }
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (!isTauri) {
    try {
      localStorage.setItem(`toolkit:${key}`, JSON.stringify(value))
    } catch {
      console.warn(`Failed to save to localStorage: ${key}`)
    }
    return
  }

  try {
    const store = await getStore()
    await store.set(key, value)
    await store.save()
  } catch {
    console.warn(`Failed to save to store: ${key}`)
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  if (!isTauri) {
    localStorage.removeItem(`toolkit:${key}`)
    return
  }

  try {
    const store = await getStore()
    await store.delete(key)
    await store.save()
  } catch {
    console.warn(`Failed to remove from store: ${key}`)
  }
}
