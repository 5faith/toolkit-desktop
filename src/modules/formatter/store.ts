import { defineStore } from 'pinia'
import { ref } from 'vue'

export type FormatMode = 'json' | 'xml' | 'yaml'

export const useFormatterStore = defineStore('formatter', () => {
  const inputText = ref('')
  const outputText = ref('')
  const mode = ref<FormatMode>('json')
  const indentSize = ref(2)
  const error = ref('')
  const durationMs = ref<number | null>(null)

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

  function setDuration(ms: number) {
    durationMs.value = ms
  }

  /** exchange input and output contents */
  function swap() {
    const input = inputText.value
    inputText.value = outputText.value
    outputText.value = input
    error.value = ''
  }

  function setMode(m: FormatMode) {
    mode.value = m
    inputText.value = ''
    outputText.value = ''
    error.value = ''
    durationMs.value = null
  }

  return {
    inputText,
    outputText,
    mode,
    indentSize,
    error,
    durationMs,
    setInput,
    setOutput,
    setError,
    setDuration,
    swap,
    setMode,
  }
})
