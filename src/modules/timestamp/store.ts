import { ref } from 'vue'
import { consumeTabSeed, useTabStore } from '@shared/composables/useTabStore'
import { useCurrentTabId } from '@shared/composables/useCurrentTab'

export interface TimestampSeed {
  inputValue?: string
  selectedTimezones?: string[]
}

export function useTimestampStore(tabId = useCurrentTabId()) {
  return useTabStore('timestamp', tabId, () => {
    const seed = consumeTabSeed<TimestampSeed>('timestamp', tabId)

    const currentTimestamp = ref(Date.now())
    const inputValue = ref(seed?.inputValue ?? '')
    const selectedTimezones = ref(
      seed?.selectedTimezones ?? ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
    )

    function setCurrentTimestamp(ts: number) {
      currentTimestamp.value = ts
    }

    function setInputValue(val: string) {
      inputValue.value = val
    }

    return {
      currentTimestamp,
      inputValue,
      selectedTimezones,
      setCurrentTimestamp,
      setInputValue,
    }
  })
}
