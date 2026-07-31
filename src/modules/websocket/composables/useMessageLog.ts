import { computed } from 'vue'
import { useWebsocketStore } from '../store'

export function useMessageLog() {
  const store = useWebsocketStore()

  const filteredMessages = computed(() => store.messages)

  function exportMessages(): string {
    return store.messages
      .map(m => `[${new Date(m.timestamp).toISOString()}] [${m.type}] ${m.content}`)
      .join('\n')
  }

  return {
    filteredMessages,
    exportMessages,
  }
}
