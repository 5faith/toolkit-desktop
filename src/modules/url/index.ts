import type { ToolModule } from '@core/module'
import { urlMeta } from './meta'
import UrlView from './components/UrlView.vue'

const urlModule: ToolModule = {
  ...urlMeta,
  route: {
    path: '/url',
    name: 'url',
    component: UrlView,
    meta: { moduleId: urlMeta.id },
  },
}

export default urlModule
