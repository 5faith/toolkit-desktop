<template>
  <div class="live-view">
    <div class="live-view__toolbar" :class="{ 'live-view__toolbar--disabled': state === 'no-mpv' }">
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
        :disabled="state === 'no-mpv' || state === 'connecting'"
        @keydown.enter="onLoad"
      />
      <button class="action-btn" :disabled="state === 'no-mpv' || state === 'connecting'" @click="onLoad">Load</button>
      <button class="action-btn" :disabled="state === 'no-mpv'" @click="togglePlay">
        {{ store.playing ? 'Pause' : 'Play' }}
      </button>
      <button class="action-btn" :disabled="state === 'no-mpv'" @click="onStop">Stop</button>
    </div>

    <div class="live-view__player">
      <div v-if="state === 'no-mpv'" class="mpv-notice">
        <div class="mpv-notice__icon">📡</div>
        <div class="mpv-notice__title">mpv not found</div>
        <div class="mpv-notice__text">
          Live Player requires mpv to be installed on your system.
        </div>
        <div class="mpv-notice__instructions">
          <div class="mpv-notice__platform">
            <strong>Windows:</strong> <code>https://sourceforge.net/projects/mpv-player-windows/files/64bit/</code>
          </div>
          <div class="mpv-notice__platform">
            <strong>macOS:</strong> <code>brew install mpv</code>
          </div>
          <div class="mpv-notice__platform">
            <strong>Linux:</strong> <code>sudo apt install mpv</code>
          </div>
        </div>
        <div class="mpv-notice__tip">Add mpv.exe to your system PATH, then restart the app.</div>
      </div>

      <div v-else-if="state === 'idle'" class="player-idle">
        <span class="player-idle__icon">📡</span>
        <span class="player-idle__text">Enter a URL and click Load to start</span>
      </div>

      <div v-else-if="state === 'connecting'" class="player-connecting">
        <span class="spinner" />
        <span class="player-connecting__text">Connecting...</span>
      </div>
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
        <span class="info-value">{{ store.playing ? 'Playing' : 'Paused' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Protocol:</span>
        <span class="info-value">{{ store.protocol.toUpperCase() }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Source:</span>
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
const { error, state, checkMpv, loadStream, togglePlay, stop, setVolume, seek } = useLivePlayer()

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

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  await checkMpv()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

function onLoad() {
  if (!store.sourceUrl) return
  loadStream(store.sourceUrl)
}

function onStop() {
  stop()
}

function onSeek(event: Event) {
  const target = event.target as HTMLInputElement
  seek(Number(target.value))
}

function onVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  const vol = Number(target.value)
  store.setVolume(vol)
  setVolume(vol)
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
  background: transparent;
}

.live-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.live-view__toolbar--disabled {
  pointer-events: none;
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

.action-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-text-tertiary);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.live-view__player {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
  position: relative;
}

.player-idle {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: #111;
}

.player-idle__icon {
  font-size: 36px;
}

.player-idle__text {
  font-size: 13px;
  color: #888;
}

.player-connecting {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: #111;
  z-index: 1;
}

.player-connecting__text {
  font-size: 14px;
  color: #fff;
}

.live-view__controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
  border-top: 1px solid var(--color-border);
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
  border-top: 1px solid var(--color-border);
}

.live-view__info {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
  border-top: 1px solid var(--color-border);
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

.mpv-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
  position: absolute;
  inset: 0;
  background: #111;
}

.mpv-notice__icon {
  font-size: 48px;
  margin-bottom: var(--spacing-sm);
}

.mpv-notice__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.mpv-notice__text {
  font-size: 14px;
  max-width: 400px;
}

.mpv-notice__text a {
  color: var(--color-accent);
  text-decoration: none;
}

.mpv-notice__text a:hover {
  text-decoration: underline;
}

.mpv-link {
  color: var(--color-accent);
  text-decoration: none;
  cursor: pointer;
}

.mpv-link:hover {
  text-decoration: underline;
}

.mpv-notice__instructions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  font-size: 13px;
}

.mpv-notice__platform {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.mpv-notice__platform code {
  background: var(--color-bg-hover);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  word-break: break-all;
}

.mpv-notice__tip {
  margin-top: var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
