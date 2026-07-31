import type { ToolModule } from '@core/module'
import meta from './meta'
import TimestampView from './components/TimestampView.vue'

const timestampModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/timestamp',
    name: 'timestamp',
    component: TimestampView,
    meta: { moduleId: 'timestamp' },
  },
}

export default timestampModule
