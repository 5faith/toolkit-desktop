import { moduleRegistry } from '@core/module-registry'
import type { ToolModule } from '@core/module'

import formatterModule from './formatter'
import timestampModule from './timestamp'
import websocketModule from './websocket'
import diffModule from './diff'
import liveModule from './flv'
import encryptModule from './encrypt'
import exifModule from './exif'
import fileshareModule from './fileshare'
import base64Module from './base64'
import shortcutsModule from './shortcuts'

const modules: ToolModule[] = [
  formatterModule,
  timestampModule,
  websocketModule,
  diffModule,
  liveModule,
  encryptModule,
  exifModule,
  fileshareModule,
  base64Module,
  shortcutsModule,
]

export function registerAllModules() {
  modules.forEach(mod => moduleRegistry.register(mod))
}
