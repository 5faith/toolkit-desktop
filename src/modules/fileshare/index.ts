import type { ToolModule } from '@core/module'
import meta from './meta'
import FileShareView from './components/FileShareView.vue'

const fileshareModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/fileshare',
    name: 'fileshare',
    component: FileShareView,
    meta: { moduleId: 'fileshare' },
  },
}

export default fileshareModule
