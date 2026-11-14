<template>
  <div ref="viewRef" class="fileshare-view">
    <div class="fileshare-view__active">
      <div class="fs-card">
        <div class="fs-card__header">
          <span class="fs-status">{{ store.running ? '正在分享...' : starting ? '正在启动...' : '服务未启动' }}</span>
          <div class="fs-header-actions">
            <button
              v-if="!store.running"
              class="btn btn--outline"
              :disabled="starting"
              @click="ensureServerRunning"
            >{{ starting ? '启动中...' : '重试' }}</button>
            <button class="btn btn--outline" @click="store.toggleSettings()">⚙ 设置</button>
            <button v-if="store.running" class="btn btn--danger-outline" @click="stopServer">取消分享</button>
          </div>
        </div>
        <div v-if="error" class="fs-card__body">
          <div class="fs-error">{{ error }}</div>
        </div>
        <div v-if="store.running" class="fs-card__body">
          <span class="fs-link-label">分享链接:</span>
          <span class="fs-link-value">{{ store.shareLink }}</span>
          <div class="fs-link-actions">
            <button class="btn btn--outline" @click="onCopyLink">🔗 复制链接</button>
            <div class="fs-nic-select">
              <span class="fs-nic-label">网卡:</span>
              <select class="fs-nic-dropdown" :value="selectedIp" @change="onNicChange">
                <option
                  v-for="iface in interfaces"
                  :key="iface.ip"
                  :value="iface.ip"
                >
                  {{ iface.name }} — {{ iface.ip }}{{ iface.is_ipv6 ? ' (IPv6)' : '' }}
                </option>
              </select>
            </div>
            <button class="btn btn--outline" @click="switchIpv6">
              📶 切换ipv{{ store.useIpv6 ? '6' : '4' }}
            </button>
          </div>
        </div>
      </div>

        <div class="fs-card">
          <div class="fs-card__header">
            <span class="fs-list-title">上传目录文件</span>
            <div class="fs-list-actions">
              <button class="btn btn--outline" @click="openFolder()">📁 打开目录</button>
              <button class="btn btn--outline" @click="refreshDirectoryFiles()">🔄 刷新</button>
            </div>
          </div>
          <div class="fs-card__body">
            <div class="fs-file-list">
              <div v-for="file in store.directoryFiles" :key="file.id" class="fs-file-row">
                <span class="fs-file-name">{{ file.name }}</span>
                <span class="fs-file-size">{{ formatFileSize(file.size) }}</span>
                <div class="fs-file-actions">
                  <button class="btn-icon" title="复制下载链接" @click="onCopyDownloadLink(file)">🔗</button>
                  <button class="btn-icon" title="打开文件夹" @click="openFolderForFile(file)">📁</button>
                </div>
              </div>
              <div v-if="store.directoryFiles.length === 0" class="fs-file-empty">
                目录为空
              </div>
            </div>
          </div>
        </div>

        <div class="fs-card">
          <div class="fs-card__header">
            <span class="fs-list-title">手动添加的文件</span>
            <div class="fs-list-actions">
              <button class="btn btn--outline" @click="showShareText = true">✉ 分享文本</button>
              <button class="btn btn--outline" @click="onClearFiles">🗑 清空列表</button>
            </div>
          </div>
          <div class="fs-card__body">
            <div class="fs-add-row">
              <input
                class="fs-add-input"
                placeholder="输入文件路径..."
                v-model="filePathInput"
                @keydown.enter="importByPath"
              />
              <button class="btn btn--outline" @click="importByPath">添加</button>
              <button class="btn btn--outline" @click="pickFiles">选择文件</button>
            </div>

            <div class="fs-file-list">
              <div v-for="file in store.manualFiles" :key="file.id" class="fs-file-row">
                <span class="fs-file-name">{{ file.name }}</span>
                <span class="fs-file-size">{{ formatFileSize(file.size) }}</span>
                <div class="fs-file-actions">
                  <button class="btn-icon" title="复制下载链接" @click="onCopyDownloadLink(file)">🔗</button>
                  <button class="btn-icon" title="打开文件夹" @click="openFolderForFile(file)">📁</button>
                  <button class="btn-icon" title="删除" @click="onRemoveFile(file)">🗑</button>
                </div>
              </div>
              <div v-if="store.manualFiles.length === 0" class="fs-file-empty">
                暂无手动添加的文件
              </div>
            </div>
          </div>
        </div>
      </div>

    <div v-if="showShareText" class="fs-settings-overlay" @mousedown="shareTextDismiss.onMouseDown" @mouseup="shareTextDismiss.onMouseUp" @click="shareTextDismiss.onClick">
      <div class="fs-settings-dialog">
        <div class="fs-settings-dialog__header">
          <span>分享文本</span>
          <button class="fs-settings-dialog__close" @click="closeShareText">✕</button>
        </div>
        <div class="fs-settings-dialog__body">
          <div class="fs-setting-row" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <input
              class="fs-setting-input"
              style="width: 100%;"
              placeholder="文件名 (例: note.txt)"
              :value="shareTextFilename"
              @input="shareTextFilename = ($event.target as HTMLInputElement).value"
            />
            <textarea
              class="fs-textarea"
              placeholder="输入要分享的文本内容..."
              :value="shareTextContent"
              @input="shareTextContent = ($event.target as HTMLTextAreaElement).value"
            />
          </div>
        </div>
        <div class="fs-settings-dialog__footer">
          <button class="btn btn--primary" @click="confirmShareText">分享</button>
          <button class="btn btn--outline" @click="closeShareText">取消</button>
        </div>
      </div>
    </div>

    <div v-if="store.showSettings" class="fs-settings-overlay" @mousedown="settingsDismiss.onMouseDown" @mouseup="settingsDismiss.onMouseUp" @click="settingsDismiss.onClick">
      <div class="fs-settings-dialog">
        <div class="fs-settings-dialog__header">
          <span>设置</span>
          <button class="fs-settings-dialog__close" @click="closeSettings">✕</button>
        </div>
        <div class="fs-settings-dialog__body">
          <div class="fs-setting-row fs-setting-row--path">
            <span class="fs-setting-label">上传路径</span>
            <div class="fs-setting-field">
              <div class="fs-setting-path">
                <input
                  class="fs-setting-input"
                  :class="{ 'fs-setting-input--error': errors.uploadPath }"
                  :value="store.settings.uploadPath"
                  @input="onUploadPathInput($event)"
                />
                <button class="btn btn--outline" @click="pickUploadPath">选择</button>
              </div>
              <span v-if="errors.uploadPath" class="fs-setting-error">{{ errors.uploadPath }}</span>
            </div>
          </div>
          <div class="fs-setting-row">
            <span class="fs-setting-label">服务端口</span>
            <div class="fs-setting-field">
              <input
                class="fs-setting-input fs-setting-input--port"
                :class="{ 'fs-setting-input--error': errors.port }"
                type="number"
                :value="store.settings.port"
                @input="onPortInput($event)"
              />
              <span v-if="errors.port" class="fs-setting-error">{{ errors.port }}</span>
            </div>
          </div>
          <div class="fs-setting-row">
            <span class="fs-setting-label">密码认证</span>
            <label class="fs-toggle">
              <input
                type="checkbox"
                :checked="store.settings.passwordAuth"
                @change="store.updateSettings({ passwordAuth: !store.settings.passwordAuth })"
              />
              <span class="fs-toggle__slider" />
            </label>
          </div>
          <div v-if="store.settings.passwordAuth" class="fs-setting-row">
            <span class="fs-setting-label">访问密码</span>
            <div class="fs-setting-field">
              <input
                class="fs-setting-input"
                :class="{ 'fs-setting-input--error': errors.password }"
                type="password"
                placeholder="至少 4 位"
                :value="store.settings.password"
                @input="store.updateSettings({ password: ($event.target as HTMLInputElement).value })"
              />
              <span v-if="errors.password" class="fs-setting-error">{{ errors.password }}</span>
            </div>
          </div>
        </div>
        <div class="fs-settings-dialog__footer">
          <button class="btn btn--primary" @click="saveSettings">更新</button>
          <button class="btn btn--outline" @click="closeSettings">取消</button>
        </div>
      </div>
    </div>

    <div v-if="dragging && !store.showSettings && !showShareText" class="fs-drag-overlay">
      <div class="fs-drag-overlay__card">释放文件以添加到分享列表</div>
    </div>
  </div>
</template>

<script setup lang="ts">

defineOptions({ name: 'FileShareView' })
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { confirm, open } from '@tauri-apps/plugin-dialog'
import { useFileshareStore, type SharedFile, type SettingsErrors } from '../store'
import { useFileShare } from '../composables/useFileShare'
import { useNotification } from '@shared/composables/useNotification'
import { useFileDrop } from '@shared/composables/useFileDrop'
import { useOverlayDismiss } from '@shared/composables/useOverlayDismiss'
import { useAppStore } from '@/stores/app'

const store = useFileshareStore()
const appStore = useAppStore()
const {
  error, interfaces, selectedIp,
  loadInterfaces, selectIp, startServer, stopServer,
  refreshLink, refreshDirectoryFiles, copyLink, copyDownloadLink, openFolder, shareText, pickFiles,
  addManualFiles, removeManualFile, clearManualFiles,
} = useFileShare()
const notification = useNotification()

const shareTextDismiss = useOverlayDismiss(closeShareText)
const settingsDismiss = useOverlayDismiss(closeSettings)

const starting = ref(false)
const isActive = computed(() => {
  const tab = appStore.openTabs.find(tab => tab.id === appStore.activeTabId)
  return tab?.moduleId === store.$id
})

const viewRef = ref<HTMLElement | null>(null)
const { dragging } = useFileDrop({
  target: viewRef,
  onDropPaths: handleDroppedPaths,
  onDropFiles: handleDroppedFiles,
})

const errors = reactive<SettingsErrors>({})
const showShareText = ref(false)
const shareTextFilename = ref('note.txt')
const shareTextContent = ref('')
const filePathInput = ref('')

onMounted(async () => {
  await store.initialize()
  void loadInterfaces()
  if (isActive.value) void ensureServerRunning()
})

watch(isActive, (active) => {
  if (active) void ensureServerRunning()
})

async function ensureServerRunning() {
  if (store.running || starting.value) return
  starting.value = true
  try {
    await store.initialize()
    if (!store.running) await startServer()
  } finally {
    starting.value = false
  }
}

async function importByPath() {
  const path = filePathInput.value.trim()
  if (!path) return
  await addManualFiles([path])
  filePathInput.value = ''
}

function baseName(path: string): string {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return index === -1 ? path : path.slice(index + 1)
}

async function handleDroppedPaths(paths: string[]) {
  if (store.showSettings || showShareText.value) return

  const existingPaths = new Set(store.manualFiles.map(file => file.path))
  const existingNames = new Set(store.manualFiles.map(file => file.name))
  const unique: string[] = []

  for (const path of paths) {
    const name = baseName(path)
    if (existingPaths.has(path) || existingNames.has(name)) continue
    if (unique.some(item => item === path || baseName(item) === name)) continue

    unique.push(path)
    existingPaths.add(path)
    existingNames.add(name)
  }

  const skipped = paths.length - unique.length
  if (unique.length === 0) {
    if (skipped > 0) notification.info('文件已在分享列表中')
    return
  }

  await addManualFiles(unique)

  if (error.value) {
    notification.error(error.value)
    return
  }

  notification.success(
    `已添加 ${unique.length} 个文件${skipped > 0 ? `，跳过 ${skipped} 个重复项` : ''}`
  )
}

async function handleDroppedFiles(files: File[]) {
  if (store.showSettings || showShareText.value) return

  const paths: string[] = []
  for (const file of files) {
    const path = (file as File & { path?: string }).path
    if (typeof path === 'string' && path.length > 0) paths.push(path)
  }

  if (paths.length > 0) {
    await handleDroppedPaths(paths)
  }

  const missing = files.length - paths.length
  if (missing > 0) {
    notification.warning(`${missing} 个文件无法读取路径，请点击「选择文件」`)
  }
}

function switchIpv6() {
  store.toggleIpv6()
  refreshLink()
}

function onNicChange(event: Event) {
  const ip = (event.target as HTMLSelectElement).value
  selectIp(ip)
}

function openFolderForFile(file: SharedFile) {
  const dir = file.path.substring(0, file.path.lastIndexOf('/')) || file.path.substring(0, file.path.lastIndexOf('\\'))
  openFolder(dir || undefined)
}

async function onCopyLink() {
  await copyLink()
  notification.success('链接已复制')
}

async function onCopyDownloadLink(file: SharedFile) {
  await copyDownloadLink(file)
  notification.success('下载链接已复制')
}

async function onRemoveFile(file: SharedFile) {
  const confirmed = await confirm(`确定删除「${file.name}」？`, { title: '删除确认', kind: 'warning' })
  if (confirmed) {
    await removeManualFile(file)
  }
}

async function onClearFiles() {
  const confirmed = await confirm('确定清空手动添加的文件？', { title: '清空确认', kind: 'warning' })
  if (confirmed) {
    await clearManualFiles()
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function confirmShareText() {
  if (!shareTextContent.value.trim()) return
  const filename = shareTextFilename.value.trim() || 'note.txt'
  shareText(shareTextContent.value, filename)
  closeShareText()
}

function closeShareText() {
  showShareText.value = false
  shareTextContent.value = ''
  shareTextFilename.value = 'note.txt'
}

function onUploadPathInput(event: Event) {
  store.updateSettings({ uploadPath: (event.target as HTMLInputElement).value })
  if (errors.uploadPath) {
    const result = store.validateSettings()
    errors.uploadPath = result.uploadPath
  }
}

async function pickUploadPath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: store.settings.uploadPath || undefined,
    })
    if (typeof selected === 'string' && selected) {
      store.updateSettings({ uploadPath: selected })
      delete errors.uploadPath
    }
  } catch {
    notification.warning('无法打开目录选择器')
  }
}

function onPortInput(event: Event) {
  store.updateSettings({ port: Number((event.target as HTMLInputElement).value) })
  if (errors.port) {
    const result = store.validateSettings()
    errors.port = result.port
  }
}

function saveSettings() {
  const result = store.validateSettings()
  Object.assign(errors, result)
  if (Object.keys(result).length === 0) {
    store.toggleSettings()
  }
}

function closeSettings() {
  Object.keys(errors).forEach(k => delete errors[k as keyof SettingsErrors])
  store.toggleSettings()
}
</script>

<style scoped>
.fileshare-view {
  position: relative;
  height: 100%;
  overflow-y: auto;
}

.fs-drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.fs-drag-overlay::before {
  content: '';
  position: absolute;
  inset: 12px;
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-xl);
}

.fs-drag-overlay__card {
  position: relative;
  z-index: 1;
  padding: 14px 22px;
  border-radius: 12px;
  background: var(--color-bg-primary);
  color: var(--color-accent);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  font-weight: 600;
}

.fs-error {
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 13px;
  text-align: left;
}

.fileshare-view__active {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100%;
  overflow-y: auto;
}

.fs-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.fs-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.fs-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.fs-status {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.fs-link-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.fs-link-value {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-accent);
}

.fs-link-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.fs-list-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.fs-list-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn--primary {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.btn--primary:hover {
  background: var(--color-accent-hover);
}

.btn--outline {
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.btn--outline:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.btn--danger-outline {
  background: transparent;
  color: var(--color-error);
  border-color: var(--color-error);
}

.btn--danger-outline:hover {
  background: var(--color-error);
  color: #fff;
}

.fs-header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.fs-dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.fs-dropzone:hover {
  border-color: var(--color-accent);
}

.fs-dropzone--active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.fs-dropzone__link {
  color: var(--color-accent);
  text-decoration: underline;
}

.fs-add-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.fs-add-input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
}

.fs-add-input:focus {
  border-color: var(--color-accent);
}

.fs-file-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fs-file-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.fs-file-row:hover {
  background: var(--color-bg-hover);
}

.fs-file-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fs-file-size {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-tertiary);
  min-width: 70px;
  text-align: right;
}

.fs-file-empty {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.fs-file-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.btn-icon:hover {
  background: var(--color-bg-hover);
}

.fs-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.fs-settings-dialog {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  width: 480px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
}

.fs-settings-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  font-size: 16px;
  font-weight: 600;
}

.fs-settings-dialog__close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--color-text-tertiary);
}

.fs-settings-dialog__body {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.fs-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fs-setting-label {
  font-size: 14px;
  color: var(--color-text-primary);
}

.fs-setting-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
  width: 200px;
}

.fs-setting-input:focus {
  border-color: var(--color-accent);
}

.fs-textarea {
  width: 100%;
  min-height: 160px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
  resize: vertical;
  font-family: var(--font-mono);
}

.fs-textarea:focus {
  border-color: var(--color-accent);
}

.fs-setting-input--port {
  width: 100px;
  text-align: center;
}

.fs-setting-field {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.fs-setting-row--path {
  gap: var(--spacing-md);
}

.fs-setting-row--path .fs-setting-field {
  flex: 1;
  min-width: 0;
}

.fs-setting-path {
  display: flex;
  gap: var(--spacing-sm);
  width: 100%;
}

.fs-setting-path .fs-setting-input {
  flex: 1;
  width: auto;
  min-width: 0;
}

.fs-setting-input--error {
  border-color: var(--color-error);
}

.fs-setting-error {
  font-size: 11px;
  color: var(--color-error);
  max-width: 200px;
  text-align: right;
}

.fs-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.fs-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.fs-toggle__slider {
  position: absolute;
  inset: 0;
  background: var(--color-bg-active);
  border-radius: 12px;
  transition: background 0.2s;
}

.fs-toggle__slider::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: var(--shadow-sm);
}

.fs-toggle input:checked + .fs-toggle__slider {
  background: var(--color-accent);
}

.fs-toggle input:checked + .fs-toggle__slider::before {
  transform: translateX(20px);
}

.fs-settings-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.fs-nic-select {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.fs-nic-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.fs-nic-dropdown {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  outline: none;
  cursor: pointer;
  max-width: 280px;
}

.fs-nic-dropdown:focus {
  border-color: var(--color-accent);
}
</style>
