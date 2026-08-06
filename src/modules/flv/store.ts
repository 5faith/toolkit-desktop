import { defineStore } from 'pinia'
import { ref } from 'vue'

export type StreamProtocol = 'flv' | 'rtmp' | 'rtsp'

export const useLiveStore = defineStore('live', () => {
  const sourceUrl = ref('')
  const protocol = ref<StreamProtocol>('flv')
  const playing = ref(false)
  const volume = ref(1)
  const duration = ref(0)
  const currentTime = ref(0)
  const isLive = ref(true)
  const initialized = ref(false)

  function setSourceUrl(url: string) { sourceUrl.value = url }
  function setProtocol(p: StreamProtocol) { protocol.value = p }
  function setPlaying(p: boolean) { playing.value = p }
  function setVolume(v: number) { volume.value = Math.max(0, Math.min(1, v)) }
  function setDuration(d: number) { duration.value = d }
  function setCurrentTime(t: number) { currentTime.value = t }
  function setIsLive(v: boolean) { isLive.value = v }
  function setInitialized(v: boolean) { initialized.value = v }

  return {
    sourceUrl, protocol, playing, volume, duration, currentTime, isLive, initialized,
    setSourceUrl, setProtocol, setPlaying, setVolume, setDuration, setCurrentTime, setIsLive, setInitialized,
  }
})
