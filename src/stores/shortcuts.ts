import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { moduleRegistry } from '@core/module-registry'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'
import { normalizeShortcut } from '@shared/utils/shortcut'

export interface ShortcutAction {
  id: string
  label: string
  icon?: string
  group: string
  defaultShortcut: string
}

export const APP_SHORTCUT_ACTIONS: ShortcutAction[] = [
  { id: 'tab.close', label: '关闭当前 Tab', group: 'Tab 操作', defaultShortcut: 'Ctrl+W' },
  { id: 'tab.duplicate', label: '复制当前 Tab', group: 'Tab 操作', defaultShortcut: 'Ctrl+Shift+D' },
  { id: 'tab.next', label: '下一个 Tab', group: 'Tab 操作', defaultShortcut: 'Ctrl+Tab' },
  { id: 'tab.prev', label: '上一个 Tab', group: 'Tab 操作', defaultShortcut: 'Ctrl+Shift+Tab' },
  { id: 'tab.next.page', label: '下一个 Tab（备用）', group: 'Tab 操作', defaultShortcut: 'Ctrl+PageDown' },
  { id: 'tab.prev.page', label: '上一个 Tab（备用）', group: 'Tab 操作', defaultShortcut: 'Ctrl+PageUp' },
]

type ShortcutOverrides = Record<string, string | null>

interface StoredConflict {
  shortcut: string
  reason: string
}

const STORAGE_KEY = 'shortcuts'
const isTauri = '__TAURI_INTERNALS__' in window

function sanitizeOverrides(value: ShortcutOverrides): ShortcutOverrides {
  const result: ShortcutOverrides = {}
  for (const [id, shortcut] of Object.entries(value)) {
    if (shortcut === null) result[id] = null
    else if (typeof shortcut === 'string') result[id] = normalizeShortcut(shortcut)
  }
  return result
}

export const useShortcutStore = defineStore('shortcuts', () => {
  const overrides = ref<ShortcutOverrides>({})
  const systemConflicts = ref<Record<string, string>>({})
  const initialized = ref(false)
  let initPromise: Promise<void> | null = null

  async function initialize(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const saved = await getStorageItem<ShortcutOverrides>(STORAGE_KEY, {})
        overrides.value = sanitizeOverrides(saved)
        initialized.value = true
      })()
    }
    return initPromise
  }

  const actions = computed<ShortcutAction[]>(() => {
    const modules = moduleRegistry.getAll()
      .filter(mod => mod.shortcut)
      .map(mod => ({
        id: `module:${mod.id}`,
        label: mod.name,
        icon: mod.icon,
        group: '工具切换',
        defaultShortcut: mod.shortcut!,
      }))

    return [...modules, ...APP_SHORTCUT_ACTIONS]
  })

  function getShortcut(actionId: string, defaultShortcut: string): string {
    const override = overrides.value[actionId]
    if (override === undefined) return normalizeShortcut(defaultShortcut)
    if (override === null) return ''
    return normalizeShortcut(override)
  }

  const duplicateKeys = computed(() => {
    const counts = new Map<string, number>()
    for (const action of actions.value) {
      const shortcut = getShortcut(action.id, action.defaultShortcut)
      if (!shortcut) continue
      counts.set(shortcut, (counts.get(shortcut) ?? 0) + 1)
    }

    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([shortcut]) => shortcut)
    )
  })

  const rows = computed(() => actions.value.map(action => {
    const shortcut = getShortcut(action.id, action.defaultShortcut)
    return {
      ...action,
      shortcut,
      modified: overrides.value[action.id] !== undefined,
      duplicate: shortcut !== '' && duplicateKeys.value.has(shortcut),
      systemConflict: shortcut ? (systemConflicts.value[shortcut] ?? '') : '',
    }
  }))

  async function checkSystemConflicts(): Promise<void> {
    const shortcuts = [...new Set(
      actions.value
        .map(action => getShortcut(action.id, action.defaultShortcut))
        .filter(Boolean)
    )]

    if (!isTauri || shortcuts.length === 0) {
      systemConflicts.value = {}
      return
    }

    try {
      const result = await invoke<StoredConflict[]>('check_shortcut_conflicts', { shortcuts })
      const map: Record<string, string> = {}
      for (const item of result) {
        map[normalizeShortcut(item.shortcut)] = item.reason
      }
      systemConflicts.value = map
    } catch {
      systemConflicts.value = {}
    }
  }

  function persist(): void {
    void setStorageItem(STORAGE_KEY, overrides.value)
  }

  function setShortcut(actionId: string, shortcut: string): void {
    const value = normalizeShortcut(shortcut)
    if (!value) return
    overrides.value = { ...overrides.value, [actionId]: value }
    persist()
  }

  function clearShortcut(actionId: string): void {
    overrides.value = { ...overrides.value, [actionId]: null }
    persist()
  }

  function resetShortcut(actionId: string): void {
    const next = { ...overrides.value }
    delete next[actionId]
    overrides.value = next
    persist()
  }

  function resetAll(): void {
    overrides.value = {}
    persist()
  }

  return {
    overrides,
    systemConflicts,
    initialized,
    actions,
    rows,
    initialize,
    getShortcut,
    checkSystemConflicts,
    setShortcut,
    clearShortcut,
    resetShortcut,
    resetAll,
  }
})
