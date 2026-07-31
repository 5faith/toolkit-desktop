import { onMounted, onUnmounted } from 'vue'
import { moduleRegistry } from '@core/module-registry'

export function useShortcuts() {
  const handlers = new Map<string, () => void>()

  function handleKeydown(event: KeyboardEvent) {
    const key = [
      event.ctrlKey || event.metaKey ? 'Ctrl' : '',
      event.shiftKey ? 'Shift' : '',
      event.altKey ? 'Alt' : '',
      event.key,
    ]
      .filter(Boolean)
      .join('+')

    const handler = handlers.get(key)
    if (handler) {
      event.preventDefault()
      handler()
    }
  }

  function register(shortcut: string, callback: () => void) {
    handlers.set(shortcut, callback)
  }

  function registerModuleShortcuts() {
    const modules = moduleRegistry.getAll()
    modules.forEach(mod => {
      if (mod.shortcut) {
        register(mod.shortcut, () => moduleRegistry.activate(mod.id))
      }
    })
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    registerModuleShortcuts()
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return { register }
}
