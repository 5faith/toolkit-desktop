import { onBeforeUnmount, ref } from 'vue'
import { useCurrentTabId } from '@shared/composables/useCurrentTab'
import { useWebsocketStore, type WsMessage } from '../store'

/** 每个 Tab 独立维护一条连接 */
const sockets = new Map<string, WebSocket>()
let msgCounter = 0

export function useWebSocket() {
  const tabId = useCurrentTabId()
  const store = useWebsocketStore(tabId)
  const error = ref('')

  function currentSocket(): WebSocket | null {
    return sockets.get(tabId) ?? null
  }

  function addMessage(type: WsMessage['type'], content: string) {
    store.addMessage({
      id: `msg-${msgCounter++}`,
      type,
      content,
      timestamp: Date.now(),
    })
  }

  function connect() {
    disconnect()

    try {
      const ws = new WebSocket(store.url)
      sockets.set(tabId, ws)

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
        if (sockets.get(tabId) === ws) sockets.delete(tabId)
      }
    } catch (e) {
      error.value = String(e)
    }
  }

  function disconnect() {
    const ws = currentSocket()
    if (!ws) return

    sockets.delete(tabId)
    store.setConnected(false)
    ws.close()
  }

  function send(message: string) {
    const ws = currentSocket()
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message)
      addMessage('sent', message)
    } else {
      error.value = 'Not connected'
    }
  }

  onBeforeUnmount(disconnect)

  return {
    error,
    connect,
    disconnect,
    send,
  }
}
