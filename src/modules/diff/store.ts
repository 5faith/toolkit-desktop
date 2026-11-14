import { computed, ref } from 'vue'
import { consumeTabSeed, useTabStore } from '@shared/composables/useTabStore'
import { useCurrentTabId } from '@shared/composables/useCurrentTab'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

export type DiffViewMode = 'side-by-side' | 'unified'

export interface DiffSeed {
  leftText?: string
  rightText?: string
  viewMode?: DiffViewMode
}

const SPLIT_KEY = 'diff:splitRatio'
const COLLAPSED_KEY = 'diff:inputCollapsed'
const DEFAULT_SPLIT = 28

/** 分栏比例与收起状态是全局偏好，所有 Tab 共用 */
const splitRatio = ref(DEFAULT_SPLIT)
const inputCollapsed = ref(false)
let preferencesLoaded = false

function clampRatio(value: number): number {
  return Math.min(90, Math.max(5, value))
}

function loadPreferences(): void {
  if (preferencesLoaded) return
  preferencesLoaded = true

  void getStorageItem(SPLIT_KEY, DEFAULT_SPLIT).then(value => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      splitRatio.value = clampRatio(value)
    }
  })
  void getStorageItem(COLLAPSED_KEY, false).then(value => {
    inputCollapsed.value = value === true
  })
}

export function useDiffStore(tabId = useCurrentTabId()) {
  return useTabStore('diff', tabId, () => {
    const seed = consumeTabSeed<DiffSeed>('diff', tabId)

    const leftText = ref(seed?.leftText ?? '')
    const rightText = ref(seed?.rightText ?? '')
    const diffResult = ref('')
    const viewMode = ref<DiffViewMode>(seed?.viewMode ?? 'side-by-side')

    loadPreferences()

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

    function setSplitRatio(value: number) {
      splitRatio.value = clampRatio(value)
      void setStorageItem(SPLIT_KEY, splitRatio.value)
    }

    function setInputCollapsed(value: boolean) {
      inputCollapsed.value = value
      void setStorageItem(COLLAPSED_KEY, value)
    }

    return {
      leftText,
      rightText,
      diffResult,
      viewMode,
      splitRatio: computed(() => splitRatio.value),
      inputCollapsed: computed(() => inputCollapsed.value),
      setLeft,
      setRight,
      setDiffResult,
      setViewMode,
      setSplitRatio,
      setInputCollapsed,
    }
  })
}
