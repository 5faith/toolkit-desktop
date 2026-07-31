import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useTimestampStore } from '../store'

export function useTimestamp() {
  const store = useTimestampStore()
  const result = ref('')
  const error = ref('')

  async function getSystemTimestamp() {
    try {
      const ts = await invoke<number>('get_system_timestamp')
      store.setCurrentTimestamp(ts)
      return ts
    } catch (e) {
      error.value = String(e)
      return Date.now()
    }
  }

  function toTimestamp(dateStr: string): number | null {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      error.value = 'Invalid date string'
      return null
    }
    return date.getTime()
  }

  function toDate(timestamp: number): string {
    return new Date(timestamp).toISOString()
  }

  async function convertTimestamp(ts: number, tz: string) {
    try {
      const converted = await invoke<string>('convert_timestamp', { ts, tz })
      result.value = converted
      error.value = ''
      return converted
    } catch (e) {
      error.value = String(e)
      const date = new Date(ts)
      return date.toLocaleString('en-US', { timeZone: tz === 'UTC' ? 'UTC' : undefined })
    }
  }

  return {
    result,
    error,
    getSystemTimestamp,
    toTimestamp,
    toDate,
    convertTimestamp,
  }
}
