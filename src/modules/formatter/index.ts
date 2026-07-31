import type { ToolModule } from '@core/module'
import meta from './meta'
import FormatterView from './components/FormatterView.vue'

const formatterModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/formatter',
    name: 'formatter',
    component: FormatterView,
    meta: { moduleId: 'formatter' },
  },
}

export default formatterModule
