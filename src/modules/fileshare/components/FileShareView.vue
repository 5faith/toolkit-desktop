<template>
  <div class="fileshare-view">
    <template v-if="!store.running">
      <div class="fileshare-view__idle">
        <button class="settings-btn" @click="store.toggleSettings()">⚙ 设置</button>
        <button class="start-btn" @click="startServer">开启服务</button>
        <button class="open-dir-btn" @click="openFolder()">📁 打开上传目录</button>
        <div v-if="error" class="fs-error">{{ error }}</div>
      </div>
    </template>

    <template v-else>
      <div class="fileshare-view__active">
        <div class="fs-card">
          <div class="fs-card__header">
            <span class="fs-status">正在分享...</span>
            <div class="fs-header-actions">
              <button class="btn btn--outline" @click="store.toggleSettings()">⚙ 设置</button>
              <button class="btn btn--danger-outline" @click="stopServer">取消分享</button>
            </div>
          </div>
          <div class="fs-card__body">
            <span class="fs-link-label">分享链接:</span>
            <span class="fs-link-value">{{ store.shareLink }}</span>
            <div class="fs-link-actions">
              <button class="btn btn--outline" @click="copyLink">🔗 复制链接</button>
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
            <span class="fs-list-title">分享列表</span>
            <div class="fs-list-actions">
              <button class="btn btn--outline" @click="showShareText = true">✉ 分享文本</button>
              <button class="btn btn--outline" @click="openFolder()">📁 打开上传目录</button>
              <button class="btn btn--outline" @click="store.clearFiles()">🗑 清空列表</button>
            </div>
          </div>
          <div class="fs-card__body">
            <div
              class="fs-dropzone"
              @dragover.prevent
              @drop.prevent="onDrop"
              @click="openFileDialog"
            >
              <input ref="fileInputRef" type="file" multiple hidden @change="onFileSelect" />
              拖拽文件或文件夹到此处或点击<span class="fs-dropzone__link">选择文件</span>，进行分享~
            </div>

            <div class="fs-file-list">
              <div v-for="file in store.sharedFiles" :key="file.id" class="fs-file-row">
                <span class="fs-file-name">{{ file.name }}</span>
                <span class="fs-file-size">{{ formatFileSize(file.size) }}</span>
                <div class="fs-file-actions">
                  <button class="btn-icon" title="复制下载链接" @click="copyDownloadLink(file)">🔗</button>
                  <button class="btn-icon" title="打开文件夹" @click="openFolderForFile(file)">📁</button>
                  <button class="btn-icon" title="删除" @click="store.removeFile(file.id)">🗑</button>
                </div>
              </div>
              <div v-if="store.sharedFiles.length === 0" class="fs-file-empty">
                暂无分享文件
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="showShareText" class="fs-settings-overlay" @click.self="closeShareText">
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

    <div v-if="store.showSettings" class="fs-settings-overlay" @click.self="closeSettings">
      <div class="fs-settings-dialog">
        <div class="fs-settings-dialog__header">
          <span>设置</span>
          <button class="fs-settings-dialog__close" @click="closeSettings">✕</button>
        </div>
        <div class="fs-settings-dialog__body">
          <div class="fs-setting-row">
            <span class="fs-setting-label">服务自启</span>
            <label class="fs-toggle">
              <input
                type="checkbox"
                :checked="store.settings.autoStart"
                @change="store.updateSettings({ autoStart: !store.settings.autoStart })"
              />
              <span class="fs-toggle__slider" />
            </label>
          </div>
          <div class="fs-setting-row">
            <span class="fs-setting-label">上传路径</span>
            <div class="fs-setting-field">
              <input
                class="fs-setting-input"
                :class="{ 'fs-setting-input--error': errors.uploadPath }"
                :value="store.settings.uploadPath"
                @input="onUploadPathInput($event)"
              />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useFileshareStore, type SharedFile, type SettingsErrors } from '../store'
import { useFileShare } from '../composables/useFileShare'

const store = useFileshareStore()
const {
  error, interfaces, selectedIp,
  loadInterfaces, selectIp, startServer, stopServer,
  refreshLink, copyLink, copyDownloadLink, openFolder, shareText, addFiles,
} = useFileShare()

const fileInputRef = ref<HTMLInputElement>()
const errors = reactive<SettingsErrors>({})
const showShareText = ref(false)
const shareTextFilename = ref('note.txt')
const shareTextContent = ref('')

onMounted(() => {
  loadInterfaces()
})

function switchIpv6() {
  store.toggleIpv6()
  refreshLink()
}

function onNicChange(event: Event) {
  const ip = (event.target as HTMLSelectElement).value
  selectIp(ip)
}

function openFileDialog() {
  fileInputRef.value?.click()
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    const paths = Array.from(input.files).map(f => (f as unknown as { path: string }).path).filter(Boolean)
    if (paths.length > 0) {
      addFiles(paths)
    }
    input.value = ''
  }
}

function onDrop(event: DragEvent) {
  const items = event.dataTransfer?.items
  if (!items) return
  const paths: string[] = []
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.()
    if (entry) {
      const p = (entry as unknown as { path?: string }).path
      if (p) paths.push(p)
    }
  }
  if (paths.length > 0) {
    addFiles(paths)
  }
}

function openFolderForFile(file: SharedFile) {
  const dir = file.path.substring(0, file.path.lastIndexOf('/')) || file.path.substring(0, file.path.lastIndexOf('\\'))
  openFolder(dir || undefined)
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
  height: 100%;
  overflow-y: auto;
}

.fileshare-view__idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #c3d4f9 0%, #d5b3f7 50%, #f5c6e8 100%);
  position: relative;
}

.start-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #4da6ff;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(77, 166, 255, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.start-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(77, 166, 255, 0.5);
}

.start-btn:active {
  transform: scale(0.98);
}

.settings-btn {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
}

.settings-btn:hover {
  background: var(--color-bg-hover);
}

.open-dir-btn {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.open-dir-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.fs-error {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 13px;
  max-width: 400px;
  text-align: center;
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

.fs-dropzone__link {
  color: var(--color-accent);
  text-decoration: underline;
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
  width: 420px;
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
