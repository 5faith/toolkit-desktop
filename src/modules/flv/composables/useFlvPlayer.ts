import { ref, onUnmounted } from 'vue'
import { useLiveStore, type StreamProtocol } from '../store'
import type { MpegtsPlayer, MpegtsStatic } from '@/lib/mpegts.js/index.d.ts'

const PROTOCOL_TO_MPEGTS_TYPE: Record<StreamProtocol, string> = {
  'flv': 'flv',
  'rtmp': 'flv',
  'rtsp': 'flv',
}

export function useLivePlayer() {
  const store = useLiveStore()
  const error = ref('')
  const mpegtsRef = ref<MpegtsStatic | null>(null)
  let player: MpegtsPlayer | null = null

  async function loadMpegts(): Promise<MpegtsStatic | null> {
    if (mpegtsRef.value) return mpegtsRef.value
    try {
      await import('@/lib/mpegts.js/mpegts.min.js')
      const g = window as unknown as Record<string, unknown>
      mpegtsRef.value = (g.mpegts || g.default) as MpegtsStatic
      if (!mpegtsRef.value) {
        error.value = 'mpegts.js loaded but not found on window'
        return null
      }
      return mpegtsRef.value
    } catch (e) {
      error.value = `Failed to load mpegts.js: ${e}`
      return null
    }
  }

  async function initPlayer(videoElement: HTMLVideoElement) {
    error.value = ''
    const mpegts = await loadMpegts()
    if (!mpegts) return

    if (!mpegts.isSupported()) {
      error.value = 'MSE playback is not supported in this environment'
      return
    }

    destroy()

    const mpegtsType = PROTOCOL_TO_MPEGTS_TYPE[store.protocol] || 'flv'
    const isLiveStream = store.isLive || ['rtmp', 'rtsp'].includes(store.protocol)

    try {
      player = mpegts.createPlayer({
        type: mpegtsType,
        url: store.sourceUrl,
        isLive: isLiveStream,
        enableStashBuffer: !isLiveStream,
      })

      player.attachMediaElement(videoElement)
      player.load()

      player.on('error', (...args: unknown[]) => {
        const errObj = args[1] as { msg?: string } | undefined
        error.value = errObj?.msg || String(args[0])
      })

      player.on('loading_complete', () => {
        store.setPlaying(false)
      })
    } catch (e) {
      error.value = String(e)
    }
  }

  async function play() {
    if (!player) return
    try {
      await player.play()
      store.setPlaying(true)
    } catch (e) {
      error.value = String(e)
    }
  }

  function pause() {
    if (player) {
      player.pause()
      store.setPlaying(false)
    }
  }

  function destroy() {
    if (player) {
      try {
        player.pause()
        player.detachMediaElement()
        player.destroy()
      } catch {
        // ignore cleanup errors
      }
      player = null
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
