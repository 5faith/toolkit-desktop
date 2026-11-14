import { ref } from 'vue'
import { consumeTabSeed, useTabStore } from '@shared/composables/useTabStore'
import { useCurrentTabId } from '@shared/composables/useCurrentTab'

export type EncryptMode = 'uuid' | 'md5' | 'aes'

export interface EncryptSeed {
  mode?: EncryptMode
  input?: string
  output?: string
  aesKey?: string
  aesIv?: string
}

export function useEncryptStore(tabId = useCurrentTabId()) {
  return useTabStore('encrypt', tabId, () => {
    const seed = consumeTabSeed<EncryptSeed>('encrypt', tabId)

    const mode = ref<EncryptMode>(seed?.mode ?? 'uuid')
    const input = ref(seed?.input ?? '')
    const output = ref(seed?.output ?? '')
    const aesKey = ref(seed?.aesKey ?? '')
    const aesIv = ref(seed?.aesIv ?? '')

    function setMode(m: EncryptMode) {
      mode.value = m
    }

    function setInput(text: string) {
      input.value = text
    }

    function setOutput(text: string) {
      output.value = text
    }

    function setAesKey(key: string) {
      aesKey.value = key
    }

    function setAesIv(iv: string) {
      aesIv.value = iv
    }

    return {
      mode,
      input,
      output,
      aesKey,
      aesIv,
      setMode,
      setInput,
      setOutput,
      setAesKey,
      setAesIv,
    }
  })
}
