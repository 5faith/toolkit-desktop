import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useFileshareStore, type SharedFile } from '../store'

let fileCounter = 0

/** 是否运行在 Tauri 原生窗口中（浏览器中 __TAURI_INTERNALS__ 不存在） */
const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

/** 安全调用 invoke：浏览器环境返回 mock 值，Tauri 环境正常 IPC */
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    // 浏览器 mock
    const mocks: Record<string, unknown> = {
      start_file_share: undefined,
      stop_file_share: undefined,
      get_local_ip: '192.168.1.100',
      get_file_info: { name: 'mock-file.txt', size: 1024 },
    }
    console.warn(`[fileshare] browser mock: invoke('${cmd}')`)
    return mocks[cmd] as T
  }
  return invoke<T>(cmd, args)
}

export function useFileShare() {
  const store = useFileshareStore()
  const error = ref('')

  async function startServer() {
    error.value = ''
    store.setRunning(true)

    try {
      await safeInvoke('start_file_share', {
        settings: {
          port: store.settings.port,
          upload_path: store.settings.uploadPath,
          password_auth: store.settings.passwordAuth,
          password: store.settings.password,
          use_ipv6: store.useIpv6,
        },
      })

      try {
        const ip = await safeInvoke<string>('get_local_ip', { useIpv6: store.useIpv6 })
        store.setCurrentIp(ip)
        store.setShareLink(`http://${ip}:${store.settings.port}`)
      } catch {
        store.setShareLink(`http://localhost:${store.settings.port}`)
      }
    } catch (e) {
      error.value = String(e)
      store.setRunning(false)
    }
  }

  async function stopServer() {
    error.value = ''
    try {
      await safeInvoke('stop_file_share')
      store.setRunning(false)
      store.setShareLink('')
    } catch (e) {
      error.value = String(e)
    }
  }

  async function refreshLink() {
    error.value = ''
    try {
      const ip = await safeInvoke<string>('get_local_ip', { useIpv6: store.useIpv6 })
      store.setCurrentIp(ip)
      store.setShareLink(`http://${ip}:${store.settings.port}`)
    } catch {
      store.setShareLink(`http://localhost:${store.settings.port}`)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(store.shareLink)
  }

  async function addFiles(filePaths: string[]) {
    error.value = ''
    try {
      for (const fp of filePaths) {
        const info = await safeInvoke<{ name: string; size: number }>('get_file_info', { path: fp })
        const file: SharedFile = {
          id: `file-${fileCounter++}`,
          name: info.name,
          size: info.size,
          ip: store.currentIp,
        }
        store.addFile(file)
      }
    } catch (e) {
      error.value = String(e)
    }
  }

  return {
    error,
    startServer,
    stopServer,
    refreshLink,
    copyLink,
    addFiles,
  }
}
