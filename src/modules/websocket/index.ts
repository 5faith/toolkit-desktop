import type { ToolModule } from '@core/module'
import meta from './meta'
import WebsocketView from './components/WebsocketView.vue'

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
}

export default websocketModule
