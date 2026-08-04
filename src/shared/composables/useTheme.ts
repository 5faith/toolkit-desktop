import { ref, computed, watchEffect, onMounted } from 'vue'
import type { ThemeMode } from '@shared/types/common'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

const mode = ref<ThemeMode>('system')

const isDark = computed(() => {
  if (mode.value === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return mode.value === 'dark'
})

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

watchEffect(() => {
  applyTheme()
})

onMounted(async () => {
  mode.value = await getStorageItem<ThemeMode>('theme', 'system')
  applyTheme()
})

export function useTheme() {
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    setStorageItem('theme', newMode)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return {
    mode,
    isDark,
    setTheme,
    toggleTheme,
  }
}
