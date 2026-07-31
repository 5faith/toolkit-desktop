<template>
  <div class="flv-player-view">
    <div class="flv-player-view__toolbar">
      <input
        v-model="store.sourceUrl"
        class="url-input"
        placeholder="Enter FLV stream URL or file path..."
      />
      <button class="action-btn" @click="loadStream">Load</button>
      <button class="action-btn" @click="togglePlay">
        {{ store.playing ? 'Pause' : 'Play' }}
      </button>
      <button class="action-btn" @click="stopStream">Stop</button>
    </div>

    <div class="flv-player-view__player">
      <video
        ref="videoRef"
        class="video-element"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
      />
    </div>

    <div class="flv-player-view__controls">
      <div class="controls__progress">
        <input
          type="range"
          class="progress-bar"
          :min="0"
          :max="store.duration"
          :value="store.currentTime"
          @input="onSeek"
        />
        <span class="time-display">
          {{ formatTime(store.currentTime) }} / {{ formatTime(store.duration) }}
        </span>
      </div>
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

    <div v-if="error" class="flv-player-view__error">{{ error }}</div>

    <div class="flv-player-view__info">
      <div class="info-item">
        <span class="info-label">Status:</span>
        <span class="info-value">{{ store.playing ? 'Playing' : 'Stopped' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">URL:</span>
        <span class="info-value">{{ store.sourceUrl || 'N/A' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFlvStore } from '../store'
import { useFlvPlayer } from '../composables/useFlvPlayer'

const store = useFlvStore()
const { error, initPlayer, play, pause, destroy } = useFlvPlayer()

const videoRef = ref<HTMLVideoElement>()

async function loadStream() {
  if (!store.sourceUrl || !videoRef.value) return
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
.flv-player-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--color-border);
}

.flv-player-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
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

.flv-player-view__player {
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

.flv-player-view__controls {
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

.time-display {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
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

.flv-player-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.flv-player-view__info {
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
