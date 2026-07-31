import { ref, onUnmounted } from 'vue'
import { useFlvStore } from '../store'

interface FlvPlayerInstance {
  attachMediaElement(element: HTMLVideoElement): void
  load(): void
  play(): void
  pause(): void
  destroy(): void
}

interface FlvJsStatic {
  isSupported(): boolean
  createPlayer(config: Record<string, unknown>): FlvPlayerInstance
}

export function useFlvPlayer() {
  const store = useFlvStore()
  const error = ref('')
  let flvPlayer: FlvPlayerInstance | null = null

  async function initPlayer(videoElement: HTMLVideoElement) {
    try {
      const flvModule = await import('@/lib/flv.js/flv.min.js')
      const flvjsModule = flvModule.default as unknown as FlvJsStatic

      if (!flvjsModule || !flvjsModule.isSupported()) {
        error.value = 'FLV playback is not supported in this environment'
        return
      }

      destroy()

      const isLive = !store.sourceUrl.includes('.flv')
      flvPlayer = flvjsModule.createPlayer({
        type: 'flv',
        url: store.sourceUrl,
        isLive,
      })

      flvPlayer.attachMediaElement(videoElement)
      flvPlayer.load()
    } catch (e) {
      error.value = String(e)
    }
  }

  function play() {
    if (flvPlayer) {
      flvPlayer.play()
      store.setPlaying(true)
    }
  }

  function pause() {
    if (flvPlayer) {
      flvPlayer.pause()
      store.setPlaying(false)
    }
  }

  function destroy() {
    if (flvPlayer) {
      flvPlayer.destroy()
      flvPlayer = null
      store.setPlaying(false)
    }
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    error,
    initPlayer,
    play,
    pause,
    destroy,
  }
}
