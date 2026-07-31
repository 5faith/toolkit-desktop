import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface WsMessage {
  id: string
  type: 'sent' | 'received' | 'system'
  content: string
  timestamp: number
}

export const useWebsocketStore = defineStore('websocket', () => {
  const url = ref('ws://localhost:8080')
  const connected = ref(false)
  const messages = ref<WsMessage[]>([])

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

  return {
    url,
    connected,
    messages,
    setUrl,
    setConnected,
    addMessage,
    clearMessages,
  }
})
