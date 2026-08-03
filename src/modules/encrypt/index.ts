import type { ToolModule } from '@core/module'
import meta from './meta'
import EncryptView from './components/EncryptView.vue'

const encryptModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/encrypt',
    name: 'encrypt',
    component: EncryptView,
    meta: { moduleId: 'encrypt' },
  },
}

export default encryptModule
