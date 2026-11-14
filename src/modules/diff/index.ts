import type { ToolModule } from '@core/module'
import meta from './meta'
import DiffView from './components/DiffView.vue'
import { useDiffStore } from './store'

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
  createDuplicateState: (sourceTabId) => {
    const store = useDiffStore(sourceTabId)
    return {
      leftText: store.leftText,
      rightText: store.rightText,
      viewMode: store.viewMode,
    }
  },
}

export default diffModule
