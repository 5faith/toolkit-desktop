<template>
  <div class="encoding-view">
    <div class="encoding-view__toolbar">
      <div class="encoding-view__tabs">
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'html' }"
          @click="activeTab = 'html'"
        >HTML</button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'encode' }"
          @click="activeTab = 'encode'"
        >Encode</button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'image' }"
          @click="activeTab = 'image'"
        >Image</button>
      </div>
    </div>

    <template v-if="activeTab === 'html'">
      <div class="encoding-view__actions">
        <button class="action-btn" @click="doHtmlFormat">Format</button>
        <button class="action-btn" @click="doHtmlEncode">Encode</button>
        <button class="action-btn" @click="doHtmlDecode">Decode</button>
        <button class="action-btn" @click="copyOutput">{{ copiedHtml ? 'Copied!' : 'Copy' }}</button>
      </div>
      <div class="encoding-view__panels">
        <div class="encoding-view__panel">
          <div class="panel-header">Input</div>
          <CodeEditor v-model="htmlInput" placeholder="Paste HTML here..." show-line-numbers />
        </div>
        <div class="encoding-view__panel">
          <div class="panel-header">Output</div>
          <CodeEditor v-model="htmlOutput" placeholder="Result..." :readonly="true" show-line-numbers />
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'encode'">
      <div class="encoding-view__actions">
        <select v-model="encodeType" class="encode-select">
          <option value="url">URL</option>
          <option value="base64">Base64</option>
        </select>
        <button class="action-btn" @click="doEncode">Encode</button>
        <button class="action-btn" @click="doDecode">Decode</button>
        <button class="action-btn" @click="copyEncodeOutput">{{ copiedEncode ? 'Copied!' : 'Copy' }}</button>
      </div>
      <div class="encoding-view__panels">
        <div class="encoding-view__panel">
          <div class="panel-header">Input</div>
          <CodeEditor v-model="encodeInput" placeholder="Enter text to encode/decode..." show-line-numbers />
        </div>
        <div class="encoding-view__panel">
          <div class="panel-header">Output</div>
          <CodeEditor v-model="encodeOutput" placeholder="Result..." :readonly="true" show-line-numbers />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="encoding-view__actions">
        <div class="direction-btns">
          <button
            class="action-btn"
            :class="{ 'action-btn--active': imgDirection === 'to-base64' }"
            @click="imgDirection = 'to-base64'"
          >Image → Base64</button>
          <button
            class="action-btn"
            :class="{ 'action-btn--active': imgDirection === 'to-image' }"
            @click="imgDirection = 'to-image'"
          >Base64 → Image</button>
        </div>
        <button v-if="imgDirection === 'to-image'" class="action-btn" :disabled="!decodedImageDataUrl" @click="downloadImage">Download</button>
        <button class="action-btn" @click="copyImgData">{{ imgCopied ? 'Copied!' : (imgDirection === 'to-base64' ? 'Copy Base64' : 'Copy Text') }}</button>
      </div>

      <template v-if="imgDirection === 'to-base64'">
        <div class="encoding-view__panels">
          <div class="encoding-view__panel">
            <div class="panel-header">Image Input</div>
            <div
              class="drop-zone"
              :class="{ 'drop-zone--active': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="onDrop"
              @click="pickFile"
            >
              <template v-if="imagePreview">
                <img :src="imagePreview" class="drop-zone__preview" />
              </template>
              <template v-else>
                <div class="drop-zone__icon">🖼</div>
                <div class="drop-zone__text">Drop image here or click to pick</div>
                <div class="drop-zone__hint">Supports PNG, JPG, GIF, WebP, SVG</div>
              </template>
            </div>
            <input ref="fileInputRef" type="file" accept="image/*" class="file-input-hidden" @change="onFileChange" />
          </div>
          <div class="encoding-view__panel">
            <div class="panel-header">Base64 Output</div>
            <CodeEditor v-model="imageBase64" placeholder="Base64 string will appear here..." :readonly="true" show-line-numbers />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="encoding-view__panels">
          <div class="encoding-view__panel">
            <div class="panel-header">Base64 Input</div>
            <CodeEditor v-model="imageBase64" placeholder="Paste Base64 string here..." show-line-numbers />
          </div>
          <div class="encoding-view__panel">
            <div class="panel-header">Image Output</div>
            <div v-if="decodedImageDataUrl" class="image-preview-area">
              <img :src="decodedImageDataUrl" class="image-preview-area__img" />
            </div>
            <div v-else class="image-preview-area image-preview-area--empty">
              <div class="drop-zone__icon">🖼</div>
              <div class="drop-zone__text">Decoded image will appear here</div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <div v-if="error" class="encoding-view__error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">

defineOptions({ name: 'EncodingView' })
import { ref, computed } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useClipboard } from '@shared/composables/useClipboard'
import { useEncodingTool } from '../composables/useEncodingTool'

const {
  formatHtml,
  encodeHtmlEntities,
  decodeHtmlEntities,
  encodeUrl,
  decodeUrl,
  encodeBase64,
  decodeBase64,
} = useEncodingTool()

const activeTab = ref<'html' | 'encode' | 'image'>('html')
const error = ref('')

const htmlInput = ref('')
const htmlOutput = ref('')
const { copy: copyHtml, copied: copiedHtml } = useClipboard()

const encodeType = ref<'url' | 'base64'>('url')
const encodeInput = ref('')
const encodeOutput = ref('')
const { copy: copyEncode, copied: copiedEncode } = useClipboard()

const imgDirection = ref<'to-base64' | 'to-image'>('to-base64')
const fileInputRef = ref<HTMLInputElement>()
const isDragging = ref(false)
const imagePreview = ref('')
const imageBase64 = ref('')
const { copy: copyImg, copied: imgCopied } = useClipboard()

const MIME_MAP: Record<string, string> = {
  '89504e47': 'image/png',
  'ffd8ffe0': 'image/jpeg',
  'ffd8ffe1': 'image/jpeg',
  'ffd8ffe2': 'image/jpeg',
  '47494638': 'image/gif',
  '52494646': 'image/webp',
  '3c3f786d': 'image/svg+xml',
  '3c737667': 'image/svg+xml',
}

const decodedImageDataUrl = computed(() => {
  const val = imageBase64.value.trim()
  if (!val) return ''
  if (val.startsWith('data:')) return val
  if (/^[A-Za-z0-9+/=\s]+$/.test(val)) {
    try {
      const binary = atob(val.replace(/\s/g, ''))
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
      const hex = Array.from(bytes.slice(0, 4), b => b.toString(16).padStart(2, '0')).join('')
      const mime = MIME_MAP[hex] || 'image/png'
      return `data:${mime};base64,${val.replace(/\s/g, '')}`
    } catch {
      return ''
    }
  }
  return ''
})

function doHtmlFormat() {
  try {
    htmlOutput.value = formatHtml(htmlInput.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function doHtmlEncode() {
  try {
    htmlInput.value = encodeHtmlEntities(htmlInput.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function doHtmlDecode() {
  try {
    htmlInput.value = decodeHtmlEntities(htmlInput.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function copyOutput() {
  if (htmlOutput.value) copyHtml(htmlOutput.value)
}

function doEncode() {
  try {
    encodeOutput.value = encodeType.value === 'url'
      ? encodeUrl(encodeInput.value)
      : encodeBase64(encodeInput.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function doDecode() {
  try {
    encodeOutput.value = encodeType.value === 'url'
      ? decodeUrl(encodeInput.value)
      : decodeBase64(encodeInput.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function copyEncodeOutput() {
  if (encodeOutput.value) copyEncode(encodeOutput.value)
}

function pickFile() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  } else {
    error.value = 'Please drop an image file'
  }
}

function processFile(file: File) {
  error.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    imagePreview.value = result
    imageBase64.value = result.split(',')[1] || ''
  }
  reader.onerror = () => {
    error.value = `Failed to read file: ${reader.error}`
  }
  reader.readAsDataURL(file)
}

function downloadImage() {
  if (!decodedImageDataUrl.value) return
  const a = document.createElement('a')
  a.href = decodedImageDataUrl.value
  a.download = 'image'
  a.click()
}

function copyImgData() {
  if (imgDirection.value === 'to-base64') {
    if (imageBase64.value) copyImg(imageBase64.value)
  } else {
    if (imageBase64.value) copyHtml(imageBase64.value)
  }
}
</script>

<style scoped>
.encoding-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--color-border);
}

.encoding-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.encoding-view__tabs {
  display: flex;
  gap: var(--spacing-xs);
}

.encoding-view__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tab-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.tab-btn:hover { background: var(--color-bg-hover); }
.tab-btn--active { background: var(--color-accent-light); color: var(--color-accent); }

.direction-btns {
  display: flex;
  gap: var(--spacing-xs);
}

.encode-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  outline: none;
  cursor: pointer;
}

.encode-select:focus { border-color: var(--color-accent); }

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
}

.action-btn:hover:not(:disabled) { background: var(--color-bg-hover); border-color: var(--color-border-hover); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn--active { background: var(--color-accent-light); color: var(--color-accent); border-color: var(--color-accent); }

.encoding-view__panels {
  display: flex;
  flex: 1;
  gap: 1px;
  background: var(--color-border);
  overflow: hidden;
}

.encoding-view__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.panel-header {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.drop-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  transition: background 0.15s;
  overflow: auto;
  padding: var(--spacing-md);
}

.drop-zone:hover { background: var(--color-bg-hover); }
.drop-zone--active { background: var(--color-accent-light); }
.drop-zone__icon { font-size: 48px; }
.drop-zone__text { font-size: 14px; color: var(--color-text-secondary); }
.drop-zone__hint { font-size: 12px; color: var(--color-text-tertiary); }
.drop-zone__preview { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: var(--radius-md); }

.file-input-hidden { display: none; }

.image-preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  overflow: auto;
}

.image-preview-area--empty { color: var(--color-text-tertiary); }

.image-preview-area__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.encoding-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>
