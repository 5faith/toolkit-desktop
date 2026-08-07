<template>
  <div class="base64-view">
    <div class="base64-view__toolbar">
      <div class="base64-view__modes">
        <button class="mode-btn" :class="{ 'mode-btn--active': mode === 'text' }" @click="mode = 'text'">Text</button>
        <button class="mode-btn" :class="{ 'mode-btn--active': mode === 'image' }" @click="mode = 'image'">Image</button>
      </div>
      <div class="base64-view__actions">
        <template v-if="mode === 'text'">
          <button class="action-btn" @click="textEncode">Encode</button>
          <button class="action-btn" @click="textDecode">Decode</button>
          <button class="action-btn" @click="copyText">{{ textCopied ? 'Copied!' : 'Copy' }}</button>
        </template>
        <template v-else>
          <div class="direction-btns">
            <button class="action-btn" :class="{ 'action-btn--active': imgDirection === 'to-base64' }" @click="imgDirection = 'to-base64'">Image → Base64</button>
            <button class="action-btn" :class="{ 'action-btn--active': imgDirection === 'to-image' }" @click="imgDirection = 'to-image'">Base64 → Image</button>
          </div>
          <button v-if="imgDirection === 'to-image'" class="action-btn" @click="downloadImage" :disabled="!decodedImageDataUrl">Download</button>
          <button class="action-btn" @click="copyImgData">{{ imgCopied ? 'Copied!' : (imgDirection === 'to-base64' ? 'Copy Base64' : 'Copy Text') }}</button>
        </template>
      </div>
    </div>

    <template v-if="mode === 'text'">
      <div class="base64-view__panels">
        <div class="base64-view__panel">
          <div class="panel-header">Input</div>
          <CodeEditor v-model="textInput" placeholder="Enter text to encode or Base64 to decode..." show-line-numbers />
        </div>
        <div class="base64-view__panel">
          <div class="panel-header">Output</div>
          <CodeEditor v-model="textOutput" placeholder="Result..." :readonly="true" show-line-numbers />
        </div>
      </div>
    </template>

    <template v-else-if="imgDirection === 'to-base64'">
      <div class="base64-view__panels">
        <div class="base64-view__panel">
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
        <div class="base64-view__panel">
          <div class="panel-header">Base64 Output</div>
          <CodeEditor v-model="imageBase64" placeholder="Base64 string will appear here..." :readonly="true" show-line-numbers />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="base64-view__panels">
        <div class="base64-view__panel">
          <div class="panel-header">Base64 Input</div>
          <CodeEditor v-model="imageBase64" placeholder="Paste Base64 string here..." show-line-numbers />
        </div>
        <div class="base64-view__panel">
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

    <div v-if="error" class="base64-view__error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useClipboard } from '@shared/composables/useClipboard'

const mode = ref<'text' | 'image'>('text')
const imgDirection = ref<'to-base64' | 'to-image'>('to-base64')

const textInput = ref('')
const textOutput = ref('')
const error = ref('')
const { copy: copyToClipboard, copied: textCopied } = useClipboard()

const fileInputRef = ref<HTMLInputElement>()
const isDragging = ref(false)
const imagePreview = ref('')
const imageBase64 = ref('')
const { copy: copyImg, copied: imgCopied } = useClipboard()

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

function textEncode() {
  try {
    const bytes = new TextEncoder().encode(textInput.value)
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
    textOutput.value = btoa(binary)
    error.value = ''
  } catch (e) {
    error.value = `Encode failed: ${e}`
  }
}

function textDecode() {
  try {
    const binary = atob(textInput.value)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    textOutput.value = new TextDecoder('utf-8').decode(bytes)
    error.value = ''
  } catch (e) {
    error.value = `Decode failed: ${e}`
  }
}

function copyText() {
  if (textOutput.value) copyToClipboard(textOutput.value)
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
    if (imageBase64.value) copyToClipboard(imageBase64.value)
  }
}
</script>

<style scoped>
.base64-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--color-border);
}

.base64-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
  gap: var(--spacing-sm);
}

.base64-view__modes {
  display: flex;
  gap: var(--spacing-xs);
}

.base64-view__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.direction-btns {
  display: flex;
  gap: var(--spacing-xs);
}

.mode-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.mode-btn:hover { background: var(--color-bg-hover); }
.mode-btn--active { background: var(--color-accent-light); color: var(--color-accent); }

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

.base64-view__panels {
  display: flex;
  flex: 1;
  gap: 1px;
  background: var(--color-border);
  overflow: hidden;
}

.base64-view__panel {
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

.image-preview-area--empty {
  color: var(--color-text-tertiary);
}

.image-preview-area__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.base64-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>
