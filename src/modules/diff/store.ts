import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DiffViewMode = 'side-by-side' | 'unified'

export const useDiffStore = defineStore('diff', () => {
  const leftText = ref('')
  const rightText = ref('')
  const diffResult = ref('')
  const viewMode = ref<DiffViewMode>('side-by-side')

  function setLeft(text: string) {
    leftText.value = text
  }

  function setRight(text: string) {
    rightText.value = text
  }

  function setDiffResult(result: string) {
    diffResult.value = result
  }

  function setViewMode(mode: DiffViewMode) {
    viewMode.value = mode
  }

  return {
    leftText,
    rightText,
    diffResult,
    viewMode,
    setLeft,
    setRight,
    setDiffResult,
    setViewMode,
  }
})
