import { defineStore } from 'pinia'
import type { UnwrapRef } from 'vue'

type StoreFactory<T> = () => T
type UnwrappedStore<T> = { [K in keyof T]: UnwrapRef<T[K]> }

const definitions = new Map<string, StoreFactory<unknown>>()
const seeds = new Map<string, unknown>()

function storeKey(moduleId: string, tabId: string): string {
  return `${moduleId}::${tabId}`
}

/**
 * 按 Tab 实例创建 Pinia store。
 * 同一 moduleId 的不同 tabId 会得到互不影响的状态。
 */
export function useTabStore<T extends object>(
  moduleId: string,
  tabId: string,
  setup: () => T
): UnwrappedStore<T> {
  const key = storeKey(moduleId, tabId)
  let factory = definitions.get(key)

  if (!factory) {
    const definition = defineStore(key, setup)
    factory = definition as unknown as StoreFactory<T>
    definitions.set(key, factory as StoreFactory<unknown>)
  }

  return (factory as StoreFactory<T>)() as UnwrappedStore<T>
}

/** 复制 Tab 时预置新实例的初始状态 */
export function setTabSeed(moduleId: string, tabId: string, seed: unknown): void {
  seeds.set(storeKey(moduleId, tabId), seed)
}

/** 取出并清除 seed（只在 store 首次创建时生效） */
export function consumeTabSeed<T>(moduleId: string, tabId: string): T | undefined {
  const key = storeKey(moduleId, tabId)
  const seed = seeds.get(key) as T | undefined
  seeds.delete(key)
  return seed
}

/** Tab 关闭时释放 store，避免旧状态残留 */
export function disposeTabStores(moduleId: string, tabId: string): void {
  const key = storeKey(moduleId, tabId)
  const factory = definitions.get(key)

  if (factory) {
    const store = factory() as { $dispose?: () => void }
    store.$dispose?.()
    definitions.delete(key)
  }

  seeds.delete(key)
}
