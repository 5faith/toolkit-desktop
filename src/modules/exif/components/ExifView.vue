<template>
  <div class="exif-view">
    <div class="exif-view__toolbar">
      <button class="action-btn" @click="pickFile">选择文件</button>
      <button v-if="store.fileSrc" class="action-btn" @click="clearAll">清除</button>
      <div v-if="store.fileSrc && store.exifData" class="toolbar__spacer" />
      <span v-if="store.exifData" class="tag-count">找到 {{ store.exifData.totalTags || 0 }} 个标签</span>
      <div v-if="store.fileSrc" class="toolbar__exports">
        <button class="action-btn" @click="exportJson">导出 JSON</button>
        <button class="action-btn" @click="exportCsv">导出 CSV</button>
      </div>
    </div>

    <div
      class="exif-view__drop-zone"
      :class="{ 'exif-view__drop-zone--active': store.fileSrc }"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <div v-if="store.loading" class="exif-view__loading-overlay">
        <div class="loading-spinner" />
        <span class="loading-text">正在解析 EXIF 数据...</span>
      </div>

      <template v-if="!store.fileSrc && !store.loading">
        <div class="drop-zone__content" @click="pickFile">
          <div class="drop-zone__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p class="drop-zone__text">拖拽图片到此处，或点击选择</p>
          <p class="drop-zone__hint">支持 JPG、PNG、WebP、HEIC、AVIF 格式</p>
        </div>
      </template>

      <template v-else>
        <div class="exif-view__result">
          <div class="exif-view__image-panel">
            <img :src="store.fileSrc" class="exif-view__image" />
            <div class="exif-view__file-info">
              <span class="file-info__name">{{ store.fileName }}</span>
              <span class="file-info__size">{{ formatSize(store.fileSize) }}</span>
            </div>
          </div>

          <div class="exif-view__data-panel">
            <div v-if="store.error" class="data-panel__error">{{ store.error }}</div>

            <template v-else-if="store.exifData">
              <div class="data-panel__tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="mode-tab"
                  :class="{ 'mode-tab--active': activeTab === tab.id }"
                  @click="activeTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div class="data-panel__content">
                <div v-if="activeTab === 'camera'" class="exif-group">
                  <div class="exif-group__title">相机</div>
                  <div v-for="f in cameraFields" :key="f.label" class="exif-field">
                    <span class="exif-field__label">{{ f.label }}</span>
                    <span class="exif-field__value">{{ f.value }}</span>
                  </div>
                </div>
                <div v-if="activeTab === 'gps'" class="exif-group">
                  <div class="exif-group__title">GPS / 位置</div>
                  <div v-for="f in gpsFields" :key="f.label" class="exif-field">
                    <span class="exif-field__label">{{ f.label }}</span>
                    <span class="exif-field__value">{{ f.value }}</span>
                  </div>
                </div>
                <div v-if="activeTab === 'shooting'" class="exif-group">
                  <div class="exif-group__title">拍摄参数</div>
                  <div v-for="f in shootingFields" :key="f.label" class="exif-field">
                    <span class="exif-field__label">{{ f.label }}</span>
                    <span class="exif-field__value">{{ f.value }}</span>
                  </div>
                </div>
                <div v-if="activeTab === 'time'" class="exif-group">
                  <div class="exif-group__title">日期与时间</div>
                  <div v-for="f in timeFields" :key="f.label" class="exif-field">
                    <span class="exif-field__label">{{ f.label }}</span>
                    <span class="exif-field__value">{{ f.value }}</span>
                  </div>
                </div>
                <div v-if="activeTab === 'software'" class="exif-group">
                  <div class="exif-group__title">元数据</div>
                  <div v-for="f in softwareFields" :key="f.label" class="exif-field">
                    <span class="exif-field__label">{{ f.label }}</span>
                    <span class="exif-field__value">{{ f.value }}</span>
                  </div>
                </div>
                <div v-if="activeTab === 'all'" class="exif-group">
                  <div class="exif-group__title">全部数据 ({{ allFields.length }})</div>
                  <div v-for="f in allFields" :key="f.label" class="exif-field">
                    <span class="exif-field__label">{{ f.label }}</span>
                    <span class="exif-field__value">{{ f.value }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="data-panel__empty">未找到 EXIF 数据</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useExifStore } from '../store'
import { useExif } from '../composables/useExif'

const store = useExifStore()
const { pickFile, handleDrop, handleDragOver, clearAll, formatSize } = useExif()

interface ExifField {
  label: string
  value: string
}

const activeTab = ref('camera')

const tabs = [
  { id: 'camera', label: '相机' },
  { id: 'gps', label: 'GPS / 位置' },
  { id: 'shooting', label: '拍摄参数' },
  { id: 'time', label: '日期与时间' },
  { id: 'software', label: '元数据' },
  { id: 'all', label: '全部数据' },
]

const cameraTags = new Set([
  'Make', 'Model', 'BodySerialNumber', 'LensModel', 'LensSerialNumber',
  'LensSpecification',
])
const gpsTags = new Set([
  'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
  'GPSAltitudeRef', 'GPSTimeStamp', 'GPSDateStamp', 'GPSStatus', 'GPSMapDatum',
  'GPSVersionID',
])
const shootingTags = new Set([
  'FocalLength', 'FNumber', 'ExposureTime', 'PhotographicSensitivity',
  'ExposureProgram', 'MeteringMode', 'Flash', 'WhiteBalance', 'ExposureMode',
  'ExposureBiasValue', 'MaxApertureValue', 'SubjectDistance', 'DigitalZoomRatio',
  'SceneCaptureType', 'GainControl', 'Contrast', 'Saturation', 'Sharpness',
  'CustomRendered', 'ShutterSpeedValue', 'ApertureValue', 'BrightnessValue',
  'FocalLengthIn35mmFilm', 'LightSource', 'SensitivityType',
])
const timeTags = new Set([
  'DateTimeOriginal', 'DateTimeDigitized', 'DateTime',
])
const softwareTags = new Set([
  'Software', 'Artist', 'Copyright', 'ImageDescription',
  'Orientation', 'ResolutionUnit', 'XResolution', 'YResolution',
  'ColorSpace', 'ExifVersion', 'FlashpixVersion', 'ComponentsConfiguration',
  'FileSource', 'SceneType', 'YCbCrPositioning', 'InteroperabilityIndex',
  'InteroperabilityVersion', 'PixelXDimension', 'PixelYDimension',
])

const cameraFields = computed<ExifField[]>(() => filterByTags(cameraTags))
const gpsFields = computed<ExifField[]>(() => filterByTags(gpsTags))
const shootingFields = computed<ExifField[]>(() => filterByTags(shootingTags))
const timeFields = computed<ExifField[]>(() => filterByTags(timeTags))
const softwareFields = computed<ExifField[]>(() => filterByTags(softwareTags))

const allFields = computed<ExifField[]>(() => {
  if (!store.exifData?.allFields) return []
  return store.exifData.allFields.map(f => ({ label: f.tag, value: f.value }))
})

function filterByTags(tags: Set<string>): ExifField[] {
  if (!store.exifData?.allFields) return []
  return store.exifData.allFields
    .filter(f => tags.has(f.tag))
    .map(f => ({ label: f.tag, value: f.value }))
}

function collectAllFields(): ExifField[] {
  return allFields.value
}

function exportJson() {
  const fields = collectAllFields()
  const obj: Record<string, string> = {}
  for (const f of fields) {
    obj[f.label] = f.value
  }
  const json = JSON.stringify(obj, null, 2)
  downloadFile(json, `${store.fileName || 'exif'}.json`, 'application/json')
}

function exportCsv() {
  const fields = collectAllFields()
  const rows = [['Tag', 'Value']]
  for (const f of fields) {
    rows.push([f.label, f.value])
  }
  const csv = rows
    .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadFile(csv, `${store.fileName || 'exif'}.csv`, 'text/csv')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.exif-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.exif-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toolbar__spacer {
  flex: 1;
}

.tag-count {
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 500;
}

.toolbar__exports {
  display: flex;
  gap: var(--spacing-xs);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.exif-view__drop-zone {
  flex: 1;
  overflow: auto;
  position: relative;
}

.drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: pointer;
}

.drop-zone__icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-md);
}

.drop-zone__text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.drop-zone__hint {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.exif-view__result {
  display: flex;
  height: 100%;
}

.exif-view__image-panel {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  border-right: 1px solid var(--color-border);
}

.exif-view__image {
  flex: 1;
  object-fit: contain;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.exif-view__file-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding-top: var(--spacing-sm);
}

.file-info__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  word-break: break-all;
}

.file-info__size {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.exif-view__data-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.exif-view__loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  background: var(--color-bg-primary);
  z-index: 10;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.data-panel__tabs {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  overflow-x: auto;
}

.mode-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s;
  white-space: nowrap;
}

.mode-tab:hover {
  background: var(--color-bg-hover);
}

.mode-tab--active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.data-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.data-panel__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  color: #ef4444;
}

.data-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  color: var(--color-text-tertiary);
}

.exif-group {
  margin-bottom: var(--spacing-md);
}

.exif-group__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-xs);
}

.exif-group__fields {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.exif-field {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.exif-field__label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.exif-field__value {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: right;
  word-break: break-all;
}
</style>
