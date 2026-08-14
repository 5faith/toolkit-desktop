import type { ToolModule } from '@core/module'
import meta from './meta'
import EncodingView from './components/EncodingView.vue'

const encodingModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/encoding',
    name: 'encoding',
    component: EncodingView,
    meta: { moduleId: 'encoding' },
  },
}

export default encodingModule
