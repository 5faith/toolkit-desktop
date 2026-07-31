import { ref } from 'vue'
import { copyToClipboard, isClipboardSupported } from '@shared/utils/clipboard'

export function useClipboard(timeout = 2000) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(text: string) {
    const success = await copyToClipboard(text)
    if (success) {
      copied.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        copied.value = false
      }, timeout)
    }
  }

  return {
    copy,
    copied,
    isSupported: isClipboardSupported(),
  }
}
