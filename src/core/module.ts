import type { RouteRecordRaw } from 'vue-router'
import type { StoreDefinition } from 'pinia'

export interface ToolModule {
  id: string
  name: string
  icon: string
  shortcut?: string
  route: RouteRecordRaw
  store?: () => StoreDefinition
  /** cache the module view with <KeepAlive> when switching tabs (default true) */
  keepAlive?: boolean
  /** wrap the module view in the shared card container (default true) */
  card?: boolean
  onActivate?(): void
  onDeactivate?(): void
}
