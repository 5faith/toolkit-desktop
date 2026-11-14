import type { ToolModule } from '@core/module'
import meta from './meta'
import FormatterView from './components/FormatterView.vue'
import { useFormatterStore } from './store'

const formatterModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  card: false,
  route: {
    path: '/formatter',
    name: 'formatter',
    component: FormatterView,
    meta: { moduleId: 'formatter' },
  },
  createDuplicateState: (sourceTabId) => {
    const store = useFormatterStore(sourceTabId)
    return {
      inputText: store.inputText,
      outputText: store.outputText,
      mode: store.mode,
      indentSize: store.indentSize,
    }
  },
}

export default formatterModule
