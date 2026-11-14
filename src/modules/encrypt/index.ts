import type { ToolModule } from '@core/module'
import meta from './meta'
import EncryptView from './components/EncryptView.vue'
import { useEncryptStore } from './store'

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
  createDuplicateState: (sourceTabId) => {
    const store = useEncryptStore(sourceTabId)
    return {
      mode: store.mode,
      input: store.input,
      output: store.output,
      aesKey: store.aesKey,
      aesIv: store.aesIv,
    }
  },
}

export default encryptModule
