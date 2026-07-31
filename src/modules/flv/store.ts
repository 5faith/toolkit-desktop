import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFlvStore = defineStore('flv', () => {
  const sourceUrl = ref('')
  const playing = ref(false)
  const volume = ref(1)
  const duration = ref(0)
  const currentTime = ref(0)

  function setSourceUrl(url: string) {
    sourceUrl.value = url
  }

  function setPlaying(p: boolean) {
    playing.value = p
  }

  function setVolume(v: number) {
    volume.value = Math.max(0, Math.min(1, v))
  }

  function setDuration(d: number) {
    duration.value = d
  }

  function setCurrentTime(t: number) {
    currentTime.value = t
  }

  return {
    sourceUrl,
    playing,
    volume,
    duration,
    currentTime,
    setSourceUrl,
    setPlaying,
    setVolume,
    setDuration,
    setCurrentTime,
  }
})
