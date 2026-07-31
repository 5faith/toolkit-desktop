export interface AppEvents {
  'module:switch': { id: string }
  'theme:change': { mode: string }
  'notification:show': { type: string; message: string }
  'notification:dismiss': { id: string }
}

export type EventName = keyof AppEvents
