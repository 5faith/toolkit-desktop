import type { ToolModule } from '@core/module'
import meta from './meta'
import DiffView from './components/DiffView.vue'

const diffModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/diff',
    name: 'diff',
    component: DiffView,
    meta: { moduleId: 'diff' },
  },
}

export default diffModule
