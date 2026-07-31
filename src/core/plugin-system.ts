import type { App } from 'vue'
import type { ToolModule } from './module'

export interface Plugin {
  id: string
  name: string
  install(app: App): void
  modules?: ToolModule[]
}

export function definePlugin(plugin: Plugin): Plugin {
  return plugin
}
