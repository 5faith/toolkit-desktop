import { ref, onUnmounted } from 'vue'
import { useLiveStore } from '../store'

let mpvApi: typeof import('tauri-plugin-mpv-api') | null = null

async function loadMpvApi() {
  if (mpvApi) return mpvApi
  mpvApi = await import('tauri-plugin-mpv-api')
  return mpvApi
}

const OBSERVED_PROPERTIES = ['pause', 'time-pos', 'duration', 'filename', 'volume', 'eof-reached'] as const

export type PlayerState = 'no-mpv' | 'idle' | 'connecting' | 'playing'

export function useLivePlayer() {
  const store = useLiveStore()
  const error = ref('')
  const state = ref<PlayerState>('idle')
  let unlisten: (() => void) | null = null

  async function checkMpv(): Promise<boolean> {
    try {
      const api = await loadMpvApi()
      await api.init({
        args: ['--hwdec=auto-safe', '--keep-open=yes'],
        observedProperties: [...OBSERVED_PROPERTIES],
        showMpvOutput: true,
      })
      unlisten = await api.observeProperties(OBSERVED_PROPERTIES, ({ name, data }) => {
        switch (name) {
          case 'pause':
            store.setPlaying(!data)
            break
          case 'time-pos':
            if (data != null) {
              store.setCurrentTime(data as number)
              if (state.value === 'connecting') {
                state.value = 'playing'
              }
            }
            break
          case 'duration':
            if (data != null) store.setDuration(data as number)
            break
          case 'volume':
            store.setVolume(data / 100)
            break
          case 'eof-reached':
            if (data === true) store.setPlaying(false)
            break
        }
      })
      state.value = 'idle'
      return true
    } catch {
      state.value = 'no-mpv'
      return false
    }
  }

  async function loadStream(url: string) {
    error.value = ''
    state.value = 'connecting'
    try {
      const api = await loadMpvApi()
      await api.command('loadfile', [url])
      await api.setProperty('volume', Math.round(store.volume * 100))
      const paused = await api.getProperty('pause')
      store.setPlaying(!paused)
    } catch (e) {
      error.value = `Failed to play: ${e}`
      state.value = 'idle'
    }
  }

  async function togglePlay() {
    try {
      const api = await loadMpvApi()
      const paused = await api.getProperty('pause')
      const newPaused = !paused
      await api.setProperty('pause', newPaused)
      store.setPlaying(!newPaused)
    } catch (e) {
      error.value = `Failed to toggle play: ${e}`
    }
  }

  async function stop() {
    try {
      const api = await loadMpvApi()
      await api.command('stop')
      store.setPlaying(false)
      store.setCurrentTime(0)
      store.setDuration(0)
      state.value = 'idle'
    } catch (e) {
      error.value = `Failed to stop: ${e}`
    }
  }

  async function setVolume(v: number) {
    try {
      const api = await loadMpvApi()
      await api.setProperty('volume', Math.round(v * 100))
    } catch (e) {
      error.value = `Failed to set volume: ${e}`
    }
  }

  async function seek(time: number) {
    try {
      const api = await loadMpvApi()
      await api.command('seek', [String(time), 'absolute'])
    } catch (e) {
      error.value = `Failed to seek: ${e}`
    }
  }

  async function destroy() {
    if (unlisten) {
      unlisten()
      unlisten = null
    }
    try {
      const api = await loadMpvApi()
      await api.destroy()
      state.value = 'idle'
    } catch {
      // ignore cleanup errors
    }
  }

  onUnmounted(() => { destroy() })

  return { error, state, checkMpv, loadStream, togglePlay, stop, setVolume, seek, destroy }
}
