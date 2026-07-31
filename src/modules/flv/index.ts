import type { ToolModule } from '@core/module'
import meta from './meta'
import FlvPlayerView from './components/FlvPlayerView.vue'

const flvModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/flv',
    name: 'flv',
    component: FlvPlayerView,
    meta: { moduleId: 'flv' },
  },
}

export default flvModule
