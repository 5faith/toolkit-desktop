import { defineStore } from 'pinia'
import { ref, onMounted } from 'vue'
import type { ThemeMode } from '@shared/types/common'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

export const useAppStore = defineStore('app', () => {
  const activeModuleId = ref('')
  const theme = ref<ThemeMode>('system')
  const sidebarCollapsed = ref(false)
  const openTabs = ref<string[]>([])

  onMounted(async () => {
    theme.value = await getStorageItem<ThemeMode>('theme', 'system')
    sidebarCollapsed.value = await getStorageItem('sidebarCollapsed', false)
    await restoreTabs()
  })

  function switchModule(id: string) {
    activeModuleId.value = id
  }

  function openTab(id: string) {
    if (!openTabs.value.includes(id)) {
      openTabs.value.push(id)
    }
    activeModuleId.value = id
    persistTabs()
  }

  /** remove a tab; returns the tab that should become active (or null) */
  function closeTab(id: string): string | null {
    const index = openTabs.value.indexOf(id)
    if (index === -1) return activeModuleId.value || null

    openTabs.value.splice(index, 1)
    let next: string | null = null
    if (activeModuleId.value === id) {
      next = openTabs.value[Math.min(index, openTabs.value.length - 1)] ?? null
      activeModuleId.value = next ?? ''
    }
    persistTabs()
    return next
  }

  function closeOthers(id: string): string | null {
    openTabs.value = [id]
    activeModuleId.value = id
    persistTabs()
    return id
  }

  function closeAll(): string | null {
    openTabs.value = []
    activeModuleId.value = ''
    persistTabs()
    return null
  }

  async function restoreTabs() {
    openTabs.value = await getStorageItem<string[]>('openTabs', [])
    const savedActive = await getStorageItem<string>('activeModuleId', '')
    if (savedActive && openTabs.value.includes(savedActive)) {
      activeModuleId.value = savedActive
    }
  }

  function persistTabs() {
    setStorageItem('openTabs', [...openTabs.value])
    setStorageItem('activeModuleId', activeModuleId.value)
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    setStorageItem('theme', mode)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    setStorageItem('sidebarCollapsed', sidebarCollapsed.value)
  }

  return {
    activeModuleId,
    theme,
    sidebarCollapsed,
    openTabs,
    switchModule,
    openTab,
    closeTab,
    closeOthers,
    closeAll,
    restoreTabs,
    setTheme,
    toggleSidebar,
  }
})
