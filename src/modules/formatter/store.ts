import { defineStore } from 'pinia'
import { ref } from 'vue'

export type FormatMode = 'json' | 'xml'

export const useFormatterStore = defineStore('formatter', () => {
  const inputText = ref('')
  const outputText = ref('')
  const mode = ref<FormatMode>('json')
  const indentSize = ref(2)
  const error = ref('')

  function setInput(text: string) {
    inputText.value = text
    error.value = ''
  }

  function setOutput(text: string) {
    outputText.value = text
  }

  function setError(msg: string) {
    error.value = msg
  }

  function setMode(m: FormatMode) {
    mode.value = m
    inputText.value = ''
    outputText.value = ''
    error.value = ''
  }

  return {
    inputText,
    outputText,
    mode,
    indentSize,
    error,
    setInput,
    setOutput,
    setError,
    setMode,
  }
})
