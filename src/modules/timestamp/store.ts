import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTimestampStore = defineStore('timestamp', () => {
  const currentTimestamp = ref(Date.now())
  const inputValue = ref('')
  const selectedTimezones = ref(['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])

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
