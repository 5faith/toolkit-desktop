import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useFileshareStore, type SharedFile, type NetworkInterface } from '../store'

let fileCounter = 0

const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    const mocks: Record<string, unknown> = {
      start_file_share: undefined,
      stop_file_share: undefined,
      get_local_ip: '192.168.1.100',
      get_file_info: { name: 'mock-file.txt', size: 1024 },
      list_network_interfaces: [
        { name: 'Ethernet', ip: '192.168.1.100', is_ipv6: false },
        { name: 'Wi-Fi', ip: '192.168.0.50', is_ipv6: false },
        { name: 'Ethernet', ip: 'fe80::1', is_ipv6: true },
      ],
      open_folder: undefined,
      save_text_file: { name: 'mock.txt', size: 10 },
      register_shared_file: { name: 'mock-file.txt', size: 1024 },
      unregister_shared_file: undefined,
      clear_shared_files_registry: undefined,
      list_directory_files: [
        { name: 'doc1.pdf', size: 2048 },
        { name: 'image.png', size: 4096 },
      ],
    }
    console.warn(`[fileshare] browser mock: invoke('${cmd}')`)
    return mocks[cmd] as T
  }
  return invoke<T>(cmd, args)
}

export function useFileShare() {
  const store = useFileshareStore()
  const error = ref('')
  const interfaces = ref<NetworkInterface[]>([])
  const selectedIp = ref('')

  async function loadInterfaces() {
    try {
      const list = await safeInvoke<NetworkInterface[]>('list_network_interfaces')
      interfaces.value = list
      if (!selectedIp.value && list.length > 0) {
        const ipv4 = list.find(i => !i.is_ipv6)
        selectedIp.value = ipv4 ? ipv4.ip : list[0].ip
      }
    } catch (e) {
      console.warn('Failed to list interfaces:', e)
    }
  }

  function selectIp(ip: string) {
    selectedIp.value = ip
    const iface = interfaces.value.find(i => i.ip === ip)
    if (iface) {
      store.useIpv6 = iface.is_ipv6
      store.setCurrentIp(ip)
      store.setShareLink(`http://${ip}:${store.settings.port}`)
    }
  }

  async function startServer() {
    error.value = ''
    store.setRunning(true)

    try {
      await fetch(`http://127.0.0.1:${store.settings.port}/__shutdown`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      }).catch(() => {})
      await new Promise(r => setTimeout(r, 300))
    } catch { /* ignore - residual server may not exist */ }

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

      await loadInterfaces()
      try {
        const ip = selectedIp.value || await safeInvoke<string>('get_local_ip', { useIpv6: store.useIpv6 })
        store.setCurrentIp(ip)
        store.setShareLink(`http://${ip}:${store.settings.port}`)
      } catch {
        store.setShareLink(`http://localhost:${store.settings.port}`)
      }

      await refreshDirectoryFiles()
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
      store.setDirectoryFiles([])
    } catch (e) {
      error.value = String(e)
    }
  }

  async function refreshLink() {
    error.value = ''
    await loadInterfaces()
    try {
      const ip = selectedIp.value || await safeInvoke<string>('get_local_ip', { useIpv6: store.useIpv6 })
      store.setCurrentIp(ip)
      store.setShareLink(`http://${ip}:${store.settings.port}`)
    } catch {
      store.setShareLink(`http://localhost:${store.settings.port}`)
    }
  }

  async function refreshDirectoryFiles() {
    try {
      const files = await safeInvoke<{ name: string; size: number }[]>('list_directory_files', {
        dirPath: store.settings.uploadPath,
      })
      const mapped: SharedFile[] = files.map(f => ({
        id: `dir-${fileCounter++}`,
        name: f.name,
        size: f.size,
        ip: store.currentIp,
        path: `${store.settings.uploadPath}/${f.name}`,
      }))
      store.setDirectoryFiles(mapped)
    } catch (e) {
      console.warn('Failed to list directory:', e)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(store.shareLink)
  }

  async function copyDownloadLink(file: SharedFile) {
    const url = `${store.shareLink}/file/${encodeURIComponent(file.name)}`
    await navigator.clipboard.writeText(url)
  }

  async function openFolder(path?: string) {
    const target = path || store.settings.uploadPath
    await safeInvoke('open_folder', { path: target })
  }

  async function shareText(text: string, filename: string) {
    error.value = ''
    try {
      const info = await safeInvoke<{ name: string; size: number }>('save_text_file', {
        uploadPath: store.settings.uploadPath,
        filename,
        content: text,
      })
      await safeInvoke('register_shared_file', { filePath: `${store.settings.uploadPath}/${info.name}` })
      const file: SharedFile = {
        id: `file-${fileCounter++}`,
        name: info.name,
        size: info.size,
        ip: store.currentIp,
        path: `${store.settings.uploadPath}/${info.name}`,
      }
      store.addManualFile(file)
    } catch (e) {
      error.value = String(e)
    }
  }

  async function addManualFiles(filePaths: string[]) {
    error.value = ''
    try {
      for (const fp of filePaths) {
        const info = await safeInvoke<{ name: string; size: number }>('register_shared_file', { filePath: fp })
        const file: SharedFile = {
          id: `file-${fileCounter++}`,
          name: info.name,
          size: info.size,
          ip: store.currentIp,
          path: fp,
        }
        store.addManualFile(file)
      }
    } catch (e) {
      error.value = String(e)
    }
  }

  async function removeManualFile(file: SharedFile) {
    await safeInvoke('unregister_shared_file', { filename: file.name })
    store.removeManualFile(file.id)
  }

  async function clearManualFiles() {
    await safeInvoke('clear_shared_files_registry')
    store.clearManualFiles()
  }

  async function pickFiles() {
    const selected = await open({
      multiple: true,
      directory: false,
    })
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected]
      if (paths.length > 0) {
        await addManualFiles(paths)
      }
    }
  }

  function initDragDrop() {
    if (!isTauri) return
    const win = getCurrentWebviewWindow()
    win.onDragDropEvent((event) => {
      console.log('[fileshare-drag]', event.payload.type, event.payload)
      if (event.payload.type === 'drop' && event.payload.paths.length > 0) {
        addManualFiles(event.payload.paths)
      }
    })
  }

  return {
    error,
    interfaces,
    selectedIp,
    loadInterfaces,
    selectIp,
    startServer,
    stopServer,
    refreshLink,
    refreshDirectoryFiles,
    copyLink,
    copyDownloadLink,
    openFolder,
    shareText,
    addManualFiles,
    removeManualFile,
    clearManualFiles,
    pickFiles,
    initDragDrop,
  }
}
