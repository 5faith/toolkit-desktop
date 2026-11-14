import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import type { ThemeMode } from '@shared/types/common'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

export interface TabInstance {
  id: string
  moduleId: string
}

interface TabsState {
  version: number
  tabs: TabInstance[]
  activeTabId: string
}

const TABS_STORAGE_KEY = 'tabsV2'

function createTabId(moduleId: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${moduleId}::${suffix}`
}

export const useAppStore = defineStore('app', () => {
  const activeTabId = ref('')
  const theme = ref<ThemeMode>('system')
  const sidebarCollapsed = ref(false)
  const openTabs = ref<TabInstance[]>([])

  /** 当前激活 Tab 对应的模块 id */
  const activeModuleId = computed(
    () => openTabs.value.find(tab => tab.id === activeTabId.value)?.moduleId ?? ''
  )

  onMounted(async () => {
    theme.value = await getStorageItem<ThemeMode>('theme', 'system')
    sidebarCollapsed.value = await getStorageItem('sidebarCollapsed', false)
  })

  /** 侧边栏/快捷键入口：同模块已存在时只激活第一个实例 */
  function openTab(moduleId: string): string {
    const existing = openTabs.value.find(tab => tab.moduleId === moduleId)
    if (existing) {
      activeTabId.value = existing.id
      persistTabs()
      return existing.id
    }

    const tab: TabInstance = { id: moduleId, moduleId }
    openTabs.value.push(tab)
    activeTabId.value = tab.id
    persistTabs()
    return tab.id
  }

  /** 复制 Tab：插入到源 Tab 右侧，但不激活（调用方设置 seed 后再激活） */
  function insertDuplicateTab(sourceTabId: string): string | null {
    const index = openTabs.value.findIndex(tab => tab.id === sourceTabId)
    if (index === -1) return null

    const source = openTabs.value[index]
    const tab: TabInstance = {
      id: createTabId(source.moduleId),
      moduleId: source.moduleId,
    }
    openTabs.value.splice(index + 1, 0, tab)
    persistTabs()
    return tab.id
  }

  function activateTab(tabId: string): void {
    if (!openTabs.value.some(tab => tab.id === tabId)) return
    activeTabId.value = tabId
    persistTabs()
  }

  function moveTab(fromIndex: number, toIndex: number): void {
    const length = openTabs.value.length
    if (fromIndex < 0 || fromIndex >= length) return

    const target = Math.min(Math.max(toIndex, 0), length - 1)
    if (target === fromIndex) return

    const [tab] = openTabs.value.splice(fromIndex, 1)
    openTabs.value.splice(target, 0, tab)
    persistTabs()
  }

  /** 关闭 Tab，返回下一个应激活的 Tab id */
  function closeTab(tabId: string): string | null {
    const index = openTabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1) return activeTabId.value || null

    openTabs.value.splice(index, 1)

    if (activeTabId.value === tabId) {
      const next = openTabs.value[Math.min(index, openTabs.value.length - 1)] ?? null
      activeTabId.value = next?.id ?? ''
    }

    persistTabs()
    return activeTabId.value || null
  }

  function closeOthers(tabId: string): string | null {
    if (!openTabs.value.some(tab => tab.id === tabId)) return activeTabId.value || null
    openTabs.value = openTabs.value.filter(tab => tab.id === tabId)
    activeTabId.value = tabId
    persistTabs()
    return tabId
  }

  function closeTabsToRight(tabId: string): string | null {
    const index = openTabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1) return activeTabId.value || null

    openTabs.value = openTabs.value.slice(0, index + 1)
    if (!openTabs.value.some(tab => tab.id === activeTabId.value)) {
      activeTabId.value = tabId
    }
    persistTabs()
    return activeTabId.value || null
  }

  function closeAll(): string | null {
    openTabs.value = []
    activeTabId.value = ''
    persistTabs()
    return null
  }

  /** 去掉已不存在的模块（模块卸载/版本变化后） */
  function pruneTabs(validModuleIds: string[]): void {
    const valid = new Set(validModuleIds)
    const next = openTabs.value.filter(tab => valid.has(tab.moduleId))
    if (next.length === openTabs.value.length) return

    openTabs.value = next
    if (!next.some(tab => tab.id === activeTabId.value)) {
      activeTabId.value = next[0]?.id ?? ''
    }
    persistTabs()
  }

  async function restoreTabs(): Promise<void> {
    const saved = await getStorageItem<TabsState | null>(TABS_STORAGE_KEY, null)

    if (saved && Array.isArray(saved.tabs)) {
      openTabs.value = saved.tabs
        .filter(tab => tab && typeof tab.id === 'string' && typeof tab.moduleId === 'string')
        .map(tab => ({ id: tab.id, moduleId: tab.moduleId }))

      const activeExists = openTabs.value.some(tab => tab.id === saved.activeTabId)
      activeTabId.value = activeExists ? saved.activeTabId : (openTabs.value[0]?.id ?? '')
      return
    }

    // 兼容旧版本：openTabs: string[] + activeModuleId
    const legacyTabs = await getStorageItem<string[]>('openTabs', [])
    const legacyActive = await getStorageItem<string>('activeModuleId', '')
    const uniqueIds = Array.from(new Set(legacyTabs.filter(id => typeof id === 'string')))

    openTabs.value = uniqueIds.map(id => ({ id, moduleId: id }))
    activeTabId.value = uniqueIds.includes(legacyActive)
      ? legacyActive
      : (openTabs.value[0]?.id ?? '')
    persistTabs()
  }

  function persistTabs(): void {
    const state: TabsState = {
      version: 2,
      tabs: openTabs.value.map(tab => ({ id: tab.id, moduleId: tab.moduleId })),
      activeTabId: activeTabId.value,
    }
    void setStorageItem(TABS_STORAGE_KEY, state)
  }

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    setStorageItem('theme', mode)
  }

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
    setStorageItem('sidebarCollapsed', sidebarCollapsed.value)
  }

  return {
    activeTabId,
    activeModuleId,
    theme,
    sidebarCollapsed,
    openTabs,
    openTab,
    insertDuplicateTab,
    activateTab,
    moveTab,
    closeTab,
    closeOthers,
    closeTabsToRight,
    closeAll,
    pruneTabs,
    restoreTabs,
    setTheme,
    toggleSidebar,
  }
})
