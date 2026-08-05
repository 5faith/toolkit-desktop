import { ref, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useLiveStore, type StreamProtocol } from '../store'
import type { MpegtsPlayer, MpegtsStatic } from '@/lib/mpegts.js/index.d.ts'

const PROTOCOL_TO_MPEGTS_TYPE: Record<StreamProtocol, string> = {
  'flv': 'flv',
  'rtmp': 'flv',
  'rtsp': 'flv',
}

function needsProxy(protocol: StreamProtocol): boolean {
  return protocol === 'rtmp' || protocol === 'rtsp'
}

export function useLivePlayer() {
  const store = useLiveStore()
  const error = ref('')
  const mpegtsRef = ref<MpegtsStatic | null>(null)
  const proxyUrl = ref('')
  let player: MpegtsPlayer | null = null

  async function loadMpegts(): Promise<MpegtsStatic | null> {
    if (mpegtsRef.value) return mpegtsRef.value
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as unknown as Record<string, unknown>).mpegts) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = new URL('@/lib/mpegts.js/mpegts.min.js', import.meta.url).href
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load mpegts.js'))
        document.head.appendChild(script)
      })
      const g = window as unknown as Record<string, unknown>
      if (!g.mpegts) {
        error.value = 'mpegts.js loaded but not found on window'
        return null
      }
      mpegtsRef.value = g.mpegts as MpegtsStatic
      return mpegtsRef.value
    } catch (e) {
      error.value = `Failed to load mpegts.js: ${e}`
      return null
    }
  }

  async function initPlayer(videoElement: HTMLVideoElement) {
    error.value = ''

    if (needsProxy(store.protocol)) {
      try {
        const port = await invoke<number>('start_stream_proxy', {
          url: store.sourceUrl,
          protocol: store.protocol,
        })
        proxyUrl.value = `http://localhost:${port}/stream.flv`
      } catch (e) {
        error.value = String(e)
        return
      }
    }

    const playUrl = needsProxy(store.protocol) ? proxyUrl.value : store.sourceUrl

    const mpegts = await loadMpegts()
    if (!mpegts) return

    if (!mpegts.isSupported()) {
      error.value = 'MSE playback is not supported in this environment'
      return
    }

    destroyMpegts()

    const mpegtsType = PROTOCOL_TO_MPEGTS_TYPE[store.protocol] || 'flv'
    const isLiveStream = true

    try {
      player = mpegts.createPlayer({
        type: mpegtsType,
        url: playUrl,
        isLive: isLiveStream,
        enableStashBuffer: false,
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

  function destroyMpegts() {
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

  async function destroy() {
    destroyMpegts()
    try {
      await invoke('stop_stream_proxy')
    } catch {
      // ignore
    }
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    error,
    proxyUrl,
    initPlayer,
    play,
    pause,
    destroy,
  }
}
