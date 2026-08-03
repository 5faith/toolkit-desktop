import { defineStore } from 'pinia'
import { ref } from 'vue'

export type EncryptMode = 'uuid' | 'md5' | 'aes'

export const useEncryptStore = defineStore('encrypt', () => {
  const mode = ref<EncryptMode>('uuid')
  const input = ref('')
  const output = ref('')
  const aesKey = ref('')
  const aesIv = ref('')

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
