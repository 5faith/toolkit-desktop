import type { ToolModule } from '@core/module'
import meta from './meta'
import ShortcutsView from './components/ShortcutsView.vue'

const shortcutsModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  duplicatable: false,
  route: {
    path: '/shortcuts',
    name: 'shortcuts',
    component: ShortcutsView,
    meta: { moduleId: 'shortcuts' },
  },
}

export default shortcutsModule
