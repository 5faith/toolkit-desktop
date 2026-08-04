import type { ToolModule } from '@core/module'
import meta from './meta'
import ExifView from './components/ExifView.vue'

const exifModule: ToolModule = {
  id: meta.id,
  name: meta.name,
  icon: meta.icon,
  shortcut: meta.shortcut,
  route: {
    path: '/exif',
    name: 'exif',
    component: ExifView,
    meta: { moduleId: 'exif' },
  },
}

export default exifModule
