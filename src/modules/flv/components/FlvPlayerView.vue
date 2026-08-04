<template>
  <div class="live-view">
    <div class="live-view__toolbar">
      <div ref="protocolSelectRef" class="protocol-select" @click.stop="showProtocolDropdown = !showProtocolDropdown">
        <span class="protocol-select__label">{{ protocolLabel }}</span>
        <span class="protocol-select__arrow">▾</span>
        <div v-if="showProtocolDropdown" class="protocol-select__dropdown">
          <div
            v-for="p in protocols"
            :key="p.value"
            class="protocol-select__option"
            :class="{ 'protocol-select__option--active': p.value === store.protocol }"
            @click.stop="onSelectProtocol(p.value)"
          >
            {{ p.label }}
          </div>
        </div>
      </div>
      <input
        v-model="store.sourceUrl"
        class="url-input"
        :placeholder="urlPlaceholder"
        @keydown.enter="loadStream"
      />
      <button class="action-btn" @click="loadStream">Load</button>
      <button class="action-btn" @click="togglePlay">
        {{ store.playing ? 'Pause' : 'Play' }}
      </button>
      <button class="action-btn" @click="stopStream">Stop</button>
    </div>

    <div class="live-view__player">
      <video
        ref="videoRef"
        class="video-element"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
      />
    </div>

    <div class="live-view__controls">
      <div class="controls__progress">
        <input
          type="range"
          class="progress-bar"
          :min="0"
          :max="store.duration"
          :value="store.currentTime"
          :disabled="store.isLive"
          @input="onSeek"
        />
        <span class="time-display">
          {{ store.isLive ? 'LIVE' : `${formatTime(store.currentTime)} / ${formatTime(store.duration)}` }}
        </span>
      </div>
      <label class="live-toggle">
        <input
          type="checkbox"
          :checked="store.isLive"
          @change="store.setIsLive(!store.isLive)"
        />
        <span class="live-toggle__label">Live</span>
      </label>
      <div class="controls__volume">
        <span>Vol</span>
        <input
          type="range"
          class="volume-bar"
          min="0"
          max="1"
          step="0.01"
          :value="store.volume"
          @input="onVolumeChange"
        />
      </div>
    </div>

    <div v-if="error" class="live-view__error">{{ error }}</div>

    <div class="live-view__info">
      <div class="info-item">
        <span class="info-label">Status:</span>
        <span class="info-value">{{ store.playing ? 'Playing' : 'Stopped' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Protocol:</span>
        <span class="info-value">{{ store.protocol.toUpperCase() }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">URL:</span>
        <span class="info-value">{{ store.sourceUrl || 'N/A' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLiveStore, type StreamProtocol } from '../store'
import { useLivePlayer } from '../composables/useFlvPlayer'

const store = useLiveStore()
const { error, initPlayer, play, pause, destroy } = useLivePlayer()

const videoRef = ref<HTMLVideoElement>()
const protocolSelectRef = ref<HTMLDivElement>()
const showProtocolDropdown = ref(false)

const protocols: { value: StreamProtocol; label: string }[] = [
  { value: 'flv', label: 'FLV (HTTP/WS)' },
  { value: 'rtmp', label: 'RTMP' },
  { value: 'rtsp', label: 'RTSP' },
]

const protocolLabel = computed(() => {
  return protocols.find(p => p.value === store.protocol)?.label ?? store.protocol
})

const urlPlaceholder = computed(() => {
  const map: Record<StreamProtocol, string> = {
    'flv': 'http:// or ws:// ... stream.flv',
    'rtmp': 'rtmp://example.com/live/stream',
    'rtsp': 'rtsp://example.com/live/stream',
  }
  return map[store.protocol]
})

function onSelectProtocol(value: StreamProtocol) {
  store.setProtocol(value)
  showProtocolDropdown.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (protocolSelectRef.value && !protocolSelectRef.value.contains(e.target as Node)) {
    showProtocolDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

async function loadStream() {
  if (!store.sourceUrl || !videoRef.value) return
  if (store.sourceUrl.startsWith('rtmp://') || store.sourceUrl.startsWith('rtsp://')) {
    error.value = `${store.protocol.toUpperCase()} protocol cannot be played directly in browser. Use a media server (SRS/MediaMTX) to convert to HTTP-FLV, then enter the HTTP-FLV URL with FLV protocol.`
    return
  }
  await initPlayer(videoRef.value)
  play()
}

function togglePlay() {
  if (store.playing) {
    pause()
  } else {
    play()
  }
}

function stopStream() {
  destroy()
  if (videoRef.value) {
    videoRef.value.currentTime = 0
  }
}

function onTimeUpdate() {
  if (videoRef.value) {
    store.setCurrentTime(videoRef.value.currentTime)
  }
}

function onLoadedMetadata() {
  if (videoRef.value) {
    store.setDuration(videoRef.value.duration)
  }
}

function onSeek(event: Event) {
  const target = event.target as HTMLInputElement
  if (videoRef.value) {
    videoRef.value.currentTime = Number(target.value)
  }
}

function onVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  const vol = Number(target.value)
  store.setVolume(vol)
  if (videoRef.value) {
    videoRef.value.volume = vol
  }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<style scoped>
.live-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--color-border);
}

.live-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.protocol-select {
  position: relative;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
  cursor: pointer;
  min-width: 100px;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  user-select: none;
}

.protocol-select:hover {
  border-color: var(--color-border-hover);
}

.protocol-select__label {
  flex: 1;
}

.protocol-select__arrow {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.protocol-select__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  overflow: hidden;
}

.protocol-select__option {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.1s;
}

.protocol-select__option:hover {
  background: var(--color-bg-hover);
}

.protocol-select__option--active {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.url-input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
}

.url-input:focus {
  border-color: var(--color-accent);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.live-view__player {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

.video-element {
  max-width: 100%;
  max-height: 100%;
}

.live-view__controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.controls__progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.progress-bar {
  flex: 1;
  height: 4px;
  accent-color: var(--color-accent);
}

.progress-bar:disabled {
  opacity: 0.4;
}

.time-display {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.live-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.live-toggle input {
  accent-color: var(--color-accent);
}

.live-toggle__label {
  user-select: none;
}

.controls__volume {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.volume-bar {
  width: 80px;
  height: 4px;
  accent-color: var(--color-accent);
}

.live-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.live-view__info {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.info-item {
  display: flex;
  gap: var(--spacing-xs);
  font-size: 12px;
}

.info-label {
  color: var(--color-text-tertiary);
}

.info-value {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}
</style>
