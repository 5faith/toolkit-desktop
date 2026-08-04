import { moduleRegistry } from '@core/module-registry'
import type { ToolModule } from '@core/module'

import formatterModule from './formatter'
import timestampModule from './timestamp'
import websocketModule from './websocket'
import diffModule from './diff'
import flvModule from './flv'
import encryptModule from './encrypt'
import fileshareModule from './fileshare'

const modules: ToolModule[] = [
  formatterModule,
  timestampModule,
  websocketModule,
  diffModule,
  flvModule,
  encryptModule,
  fileshareModule,
]

export function registerAllModules() {
  modules.forEach(mod => moduleRegistry.register(mod))
}
