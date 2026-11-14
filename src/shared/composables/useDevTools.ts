import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

const DEVTOOLS_KEY = 'devtools:enabled'
const isDesktop = '__TAURI_INTERNALS__' in window

const enabled = ref(true)
let initialized = false

async function openDevTools() {
  if (!isDesktop) return
  try {
    await invoke('open_devtools')
  } catch {
    // release 构建未启用 devtools 时忽略
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!isDesktop || event.key !== 'F12' || event.repeat || !enabled.value) return
  event.preventDefault()
  event.stopPropagation()
  void openDevTools()
}

export function useDevTools() {
  async function initialize() {
    if (initialized) return
    initialized = true
    enabled.value = await getStorageItem<boolean>(DEVTOOLS_KEY, true)
    window.addEventListener('keydown', onKeydown, true)
  }

  function setEnabled(value: boolean) {
    enabled.value = value
    void setStorageItem(DEVTOOLS_KEY, value)
  }

  return {
    enabled,
    isDesktop,
    initialize,
    setEnabled,
    openDevTools,
  }
}
