import type { ToolModule } from '@core/module'
import meta from './meta'
import Base64View from './components/Base64View.vue'

const base64Module: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/base64',
    name: 'base64',
    component: Base64View,
    meta: { moduleId: 'base64' },
  },
}

export default base64Module
