import { ref } from 'vue'
import { useWebsocketStore, type WsMessage } from '../store'

let ws: WebSocket | null = null
let msgCounter = 0

export function useWebSocket() {
  const store = useWebsocketStore()
  const error = ref('')

  function addMessage(type: WsMessage['type'], content: string) {
    store.addMessage({
      id: `msg-${msgCounter++}`,
      type,
      content,
      timestamp: Date.now(),
    })
  }

  function connect() {
    if (ws) disconnect()

    try {
      ws = new WebSocket(store.url)

      ws.onopen = () => {
        store.setConnected(true)
        error.value = ''
        addMessage('system', `Connected to ${store.url}`)
      }

      ws.onmessage = (event) => {
        addMessage('received', typeof event.data === 'string' ? event.data : '[binary data]')
      }

      ws.onerror = () => {
        error.value = 'WebSocket error occurred'
        addMessage('system', 'Error occurred')
      }

      ws.onclose = (event) => {
        store.setConnected(false)
        addMessage('system', `Disconnected (code: ${event.code})`)
        ws = null
      }
    } catch (e) {
      error.value = String(e)
    }
  }

  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
  }

  function send(message: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message)
      addMessage('sent', message)
    } else {
      error.value = 'Not connected'
    }
  }

  return {
    error,
    connect,
    disconnect,
    send,
  }
}
