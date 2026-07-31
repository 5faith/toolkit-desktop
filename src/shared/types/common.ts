export type ThemeMode = 'light' | 'dark' | 'system'

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface ClipboardResult {
  copy: (text: string) => Promise<void>
  copied: import('vue').Ref<boolean>
  isSupported: boolean
}
