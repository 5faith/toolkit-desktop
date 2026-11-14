const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])
const IS_MAC = navigator.userAgent.includes('Macintosh')

const KEY_ALIASES: Record<string, string> = {
  Esc: 'Escape',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Del: 'Delete',
  PrtSc: 'PrintScreen',
}

export function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  const alias = KEY_ALIASES[key]
  if (alias) return alias
  if (key.length === 1) return key.toUpperCase()
  return key
}

/** 将 "ctrl+shift+d" 之类统一成 "Ctrl+Shift+D"。 */
export function normalizeShortcut(shortcut: string): string {
  const parts = shortcut.split('+').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return ''

  const modifiers = new Set<string>()
  let key = ''

  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'ctrl' || lower === 'control') modifiers.add('Ctrl')
    else if (lower === 'shift') modifiers.add('Shift')
    else if (lower === 'alt') modifiers.add('Alt')
    else key = normalizeKey(part)
  }

  const ordered = ['Ctrl', 'Shift', 'Alt'].filter(modifier => modifiers.has(modifier))
  return [...ordered, key].filter(Boolean).join('+')
}

/** 从键盘事件生成快捷键字符串；纯修饰键或不含修饰键的普通键返回 null。 */
export function shortcutFromEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null

  const key = normalizeKey(event.key)
  if (!key) return null

  const modifiers: string[] = []
  const primary = IS_MAC ? event.metaKey : event.ctrlKey
  if (primary) modifiers.push('Ctrl')
  if (event.shiftKey) modifiers.push('Shift')
  if (event.altKey) modifiers.push('Alt')

  const functionKey = /^F\d{1,2}$/.test(key)
  const standalone = functionKey || key === 'PrintScreen'
  if (modifiers.length === 0 && !standalone) return null

  return [...modifiers, key].join('+')
}
