import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'
import { downloadDir } from '@tauri-apps/api/path'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

const isTauri = '__TAURI_INTERNALS__' in window

export interface SharedFile {
  id: string
  name: string
  size: number
  ip: string
  path: string
}

export interface NetworkInterface {
  name: string
  ip: string
  is_ipv6: boolean
}

export interface FileShareSettings {
  uploadPath: string
  port: number
  passwordAuth: boolean
  password: string
  networkIp: string
}

export interface SettingsErrors {
  uploadPath?: string
  port?: string
  password?: string
}

const SETTINGS_KEY = 'fileshare:settings'
const MANUAL_FILES_KEY = 'fileshare:manualFiles'

const defaultSettings: FileShareSettings = {
  uploadPath: '',
  port: 5421,
  passwordAuth: false,
  password: '',
  networkIp: '',
}

/** 旧版本写死的无效默认路径，初始化时自动替换为系统下载目录。 */
const LEGACY_UPLOAD_PATHS = ['C:\\Users\\fidel\\Downloads']

async function resolveDefaultUploadPath(): Promise<string> {
  if (!isTauri) return 'C:\\Users\\Downloads'
  try {
    return await downloadDir()
  } catch {
    return ''
  }
}

export const useFileshareStore = defineStore('fileshare', () => {
  const running = ref(false)
  const shareLink = ref('')
  const currentIp = ref('')
  const useIpv6 = ref(false)
  const directoryFiles = ref<SharedFile[]>([])
  const manualFiles = ref<SharedFile[]>([])
  const isDragging = ref(false)

  const settings = ref<FileShareSettings>({ ...defaultSettings })
  const showSettings = ref(false)

  let initPromise: Promise<void> | null = null

  async function initialize(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const saved = await getStorageItem<FileShareSettings>(SETTINGS_KEY, { ...defaultSettings })
        settings.value = { ...defaultSettings, ...saved }
        await ensureValidUploadPath()
        const savedManual = await getStorageItem<SharedFile[]>(MANUAL_FILES_KEY, [])
        manualFiles.value = savedManual
      })()
    }
    return initPromise
  }

  /** 修正空路径或旧版本写死的无效默认路径，返回当前可用的上传目录。 */
  async function ensureValidUploadPath(): Promise<string> {
    const current = settings.value.uploadPath.trim()
    if (current && !LEGACY_UPLOAD_PATHS.includes(current)) return current
    const resolved = await resolveDefaultUploadPath()
    if (resolved) settings.value = { ...settings.value, uploadPath: resolved }
    return settings.value.uploadPath
  }

  onMounted(() => {
    void initialize()
  })

  watch(settings, (v) => {
    setStorageItem(SETTINGS_KEY, v)
  }, { deep: true })

  watch(manualFiles, (v) => {
    setStorageItem(MANUAL_FILES_KEY, v)
  }, { deep: true })

  function validateSettings(): SettingsErrors {
    const errors: SettingsErrors = {}

    if (!settings.value.uploadPath.trim()) {
      errors.uploadPath = '上传路径不能为空'
    }

    const port = settings.value.port
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.port = '端口范围 1-65535'
    }

    if (settings.value.passwordAuth) {
      if (!settings.value.password) {
        errors.password = '开启密码认证时必须设置密码'
      } else if (settings.value.password.length < 4) {
        errors.password = '密码至少 4 位'
      }
    }

    return errors
  }

  function setRunning(v: boolean) {
    running.value = v
  }

  function setShareLink(link: string) {
    shareLink.value = link
  }

  function setCurrentIp(ip: string) {
    currentIp.value = ip
  }

  function toggleIpv6() {
    useIpv6.value = !useIpv6.value
  }

  function addDirectoryFile(file: SharedFile) {
    directoryFiles.value.push(file)
  }

  function setDirectoryFiles(files: SharedFile[]) {
    directoryFiles.value = files
  }

  function addManualFile(file: SharedFile) {
    manualFiles.value.push(file)
  }

  function removeManualFile(id: string) {
    manualFiles.value = manualFiles.value.filter(f => f.id !== id)
  }

  function clearManualFiles() {
    manualFiles.value = []
  }

  function updateSettings(partial: Partial<FileShareSettings>) {
    settings.value = { ...settings.value, ...partial }
  }

  function toggleSettings() {
    showSettings.value = !showSettings.value
  }

  function setDragging(v: boolean) {
    isDragging.value = v
  }

  return {
    running,
    shareLink,
    currentIp,
    useIpv6,
    directoryFiles,
    manualFiles,
    isDragging,
    settings,
    showSettings,
    initialize,
    ensureValidUploadPath,
    validateSettings,
    setRunning,
    setShareLink,
    setCurrentIp,
    toggleIpv6,
    addDirectoryFile,
    setDirectoryFiles,
    addManualFile,
    removeManualFile,
    clearManualFiles,
    updateSettings,
    toggleSettings,
    setDragging,
  }
})
