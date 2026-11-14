import { computed, ref } from 'vue'
import { consumeTabSeed, useTabStore } from '@shared/composables/useTabStore'
import { useCurrentTabId } from '@shared/composables/useCurrentTab'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

export type FormatMode = 'json' | 'xml' | 'yaml'

export interface FormatterSeed {
  inputText?: string
  outputText?: string
  mode?: FormatMode
  indentSize?: number
}

const SPLIT_KEY = 'formatter:splitRatio'
const DEFAULT_SPLIT = 50

/** 分栏比例是全局偏好，所有 Tab 共用 */
const splitRatio = ref(DEFAULT_SPLIT)
let splitLoaded = false

function clampRatio(value: number): number {
  return Math.min(90, Math.max(10, value))
}

function loadSplitRatio(): void {
  if (splitLoaded) return
  splitLoaded = true
  void getStorageItem(SPLIT_KEY, DEFAULT_SPLIT).then(value => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      splitRatio.value = clampRatio(value)
    }
  })
}

export function useFormatterStore(tabId = useCurrentTabId()) {
  return useTabStore('formatter', tabId, () => {
    const seed = consumeTabSeed<FormatterSeed>('formatter', tabId)

    const inputText = ref(seed?.inputText ?? '')
    const outputText = ref(seed?.outputText ?? '')
    const mode = ref<FormatMode>(seed?.mode ?? 'json')
    const indentSize = ref(seed?.indentSize ?? 2)
    const error = ref('')
    const durationMs = ref<number | null>(null)

    loadSplitRatio()

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

    function setIndentSize(size: number) {
      indentSize.value = size
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

    function setSplitRatio(value: number) {
      splitRatio.value = clampRatio(value)
      void setStorageItem(SPLIT_KEY, splitRatio.value)
    }

    return {
      inputText,
      outputText,
      mode,
      indentSize,
      error,
      durationMs,
      splitRatio: computed(() => splitRatio.value),
      setInput,
      setOutput,
      setError,
      setDuration,
      setIndentSize,
      swap,
      setMode,
      setSplitRatio,
    }
  })
}
