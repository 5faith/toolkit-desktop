import { useFormatterStore } from '../store'
import { invoke } from '@tauri-apps/api/core'

export function useFormatter() {
  const store = useFormatterStore()

  async function format() {
    try {
      if (store.mode === 'json') {
        const result = await invoke<string>('format_json', {
          input: store.inputText,
          indent: store.indentSize,
        })
        store.setOutput(result)
        store.setError('')
      } else {
        const result = await invoke<string>('format_xml', {
          input: store.inputText,
        })
        store.setOutput(result)
        store.setError('')
      }
    } catch (e) {
      store.setError(String(e))
    }
  }

  async function compress() {
    try {
      if (store.mode === 'json') {
        const result = await invoke<string>('format_json', {
          input: store.inputText,
          indent: 0,
        })
        store.setOutput(result)
        store.setError('')
      } else {
        store.setError('XML compression not supported')
      }
    } catch (e) {
      store.setError(String(e))
    }
  }

  async function compressOverride() {
    try {
      if (store.mode === 'json') {
        const result = await invoke<string>('format_json', {
          input: store.inputText,
          indent: 0,
        })
        store.setInput(result)
        store.setOutput('')
        store.setError('')
      } else {
        store.setError('XML compression not supported')
      }
    } catch (e) {
      store.setError(String(e))
    }
  }

  function unescape() {
    try {
      const input = store.inputText
      const unescaped = input
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      store.setOutput(unescaped)
      store.setError('')
    } catch (e) {
      store.setError(String(e))
    }
  }

  async function validate() {
    try {
      if (store.mode === 'json') {
        await invoke('validate_json', { input: store.inputText })
        store.setError('')
        return true
      } else {
        await invoke('validate_xml', { input: store.inputText })
        store.setError('')
        return true
      }
    } catch (e) {
      store.setError(String(e))
      return false
    }
  }

  return { format, compress, compressOverride, unescape, validate }
}
