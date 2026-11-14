import type { ToolModule } from '@core/module'
import meta from './meta'
import WebsocketView from './components/WebsocketView.vue'
import { useWebsocketStore } from './store'

const websocketModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/websocket',
    name: 'websocket',
    component: WebsocketView,
    meta: { moduleId: 'websocket' },
  },
  createDuplicateState: (sourceTabId) => {
    const store = useWebsocketStore(sourceTabId)
    return { url: store.url }
  },
}

export default websocketModule
