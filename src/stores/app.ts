import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ThemeMode } from '@shared/types/common'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

export const useAppStore = defineStore('app', () => {
  const activeModuleId = ref('')
  const theme = ref<ThemeMode>(getStorageItem('theme', 'system'))
  const sidebarCollapsed = ref(getStorageItem('sidebarCollapsed', false))

  function switchModule(id: string) {
    activeModuleId.value = id
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
    switchModule,
    setTheme,
    toggleSidebar,
  }
})
