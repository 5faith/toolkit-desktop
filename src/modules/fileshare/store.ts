import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'
import { getStorageItem, setStorageItem } from '@shared/utils/storage'

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
  autoStart: boolean
  uploadPath: string
  port: number
  passwordAuth: boolean
  password: string
}

export interface SettingsErrors {
  uploadPath?: string
  port?: string
  password?: string
}

const SETTINGS_KEY = 'fileshare:settings'
const MANUAL_FILES_KEY = 'fileshare:manualFiles'

const defaultSettings: FileShareSettings = {
  autoStart: false,
  uploadPath: 'C:\\Users\\fidel\\Downloads',
  port: 5421,
  passwordAuth: false,
  password: '',
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

  onMounted(async () => {
    const saved = await getStorageItem<FileShareSettings>(SETTINGS_KEY, { ...defaultSettings })
    settings.value = saved
    const savedManual = await getStorageItem<SharedFile[]>(MANUAL_FILES_KEY, [])
    manualFiles.value = savedManual
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
