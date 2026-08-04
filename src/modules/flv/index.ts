import type { ToolModule } from '@core/module'
import meta from './meta'
import LiveView from './components/FlvPlayerView.vue'

const liveModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/live',
    name: 'live',
    component: LiveView,
    meta: { moduleId: 'live' },
  },
}

export default liveModule
