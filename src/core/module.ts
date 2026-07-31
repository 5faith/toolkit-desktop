import type { RouteRecordRaw } from 'vue-router'
import type { StoreDefinition } from 'pinia'

export interface ToolModule {
  id: string
  name: string
  icon: string
  shortcut?: string
  route: RouteRecordRaw
  store?: () => StoreDefinition
  onActivate?(): void
  onDeactivate?(): void
}
