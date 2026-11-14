import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { shortcutFromEvent } from '@shared/utils/shortcut'

export interface ShortcutBinding {
  shortcut: string
  handler: () => void
}

let suspended = false

/** 录制快捷键时暂停全局分发，避免触发已有快捷键。 */
export function setShortcutsSuspended(value: boolean): void {
  suspended = value
}

export function useShortcuts(
  bindings: Ref<ShortcutBinding[]> | (() => ShortcutBinding[])
) {
  const handlers = new Map<string, () => void>()
  const read = typeof bindings === 'function' ? bindings : () => bindings.value

  function rebuild() {
    handlers.clear()
    for (const binding of read()) {
      if (!binding.shortcut || handlers.has(binding.shortcut)) continue
      handlers.set(binding.shortcut, binding.handler)
    }
  }

  watch(read, rebuild, { immediate: true, deep: true })

  function handleKeydown(event: KeyboardEvent) {
    // 录制快捷键时完全暂停分发。
    if (suspended) return
    // 只在应用窗口处于前台时接管快捷键，窗口失焦后完全交还系统。
    if (!document.hasFocus()) return
    if (event.defaultPrevented || event.isComposing) return

    // 统一大小写与修饰键顺序，避免 Win+ 组合被误判成 Ctrl+。
    const shortcut = shortcutFromEvent(event)
    if (!shortcut) return

    const handler = handlers.get(shortcut)
    if (handler) {
      event.preventDefault()
      // 捕获阶段拦截，确保软件快捷键优先于页面/WebView 默认行为。
      event.stopPropagation()
      handler()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown, { capture: true })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown, { capture: true })
  })
}
