import { ref } from 'vue'
import { consumeTabSeed, useTabStore } from '@shared/composables/useTabStore'
import { useCurrentTabId } from '@shared/composables/useCurrentTab'

export interface WsMessage {
  id: string
  type: 'sent' | 'received' | 'system'
  content: string
  timestamp: number
}

export interface WebsocketSeed {
  url?: string
}

export function useWebsocketStore(tabId = useCurrentTabId()) {
  return useTabStore('websocket', tabId, () => {
    const seed = consumeTabSeed<WebsocketSeed>('websocket', tabId)

    const url = ref(seed?.url ?? 'ws://localhost:8080')
    const connected = ref(false)
    const messages = ref<WsMessage[]>([])
    const autoBottom = ref(true)

    function setUrl(u: string) {
      url.value = u
    }

    function setConnected(c: boolean) {
      connected.value = c
    }

    function addMessage(msg: WsMessage) {
      messages.value.push(msg)
    }

    function clearMessages() {
      messages.value = []
    }

    function setAutoBottom(v: boolean) {
      autoBottom.value = v
    }

    return {
      url,
      connected,
      messages,
      autoBottom,
      setUrl,
      setConnected,
      addMessage,
      clearMessages,
      setAutoBottom,
    }
  })
}
