<template>
  <div class="timestamp-view">
    <div class="timestamp-view__section">
      <h3 class="section-title">Current Timestamp</h3>
      <div class="timestamp-view__now">
        <span class="timestamp-value">{{ currentTs }}</span>
        <button class="action-btn" @click="refreshTimestamp">Refresh</button>
        <button class="action-btn" @click="copyTimestamp">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
    </div>

    <div class="timestamp-view__section">
      <h3 class="section-title">Converter</h3>
      <div class="converter">
        <div class="converter__row">
          <label class="converter__label">Date String / Timestamp</label>
          <input
            v-model="store.inputValue"
            class="converter__input"
            placeholder="2024-01-01 00:00:00 or 1704067200000"
            @keyup.enter="convert"
          />
          <button class="action-btn" @click="convert">Convert</button>
        </div>
        <div v-if="tsResult" class="converter__result">
          <div class="result-item">
            <span class="result-label">Timestamp (ms):</span>
            <span class="result-value">{{ tsResult }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Date:</span>
            <span class="result-value">{{ dateResult }}</span>
          </div>
        </div>
        <div v-if="error" class="converter__error">{{ error }}</div>
      </div>
    </div>

    <div class="timestamp-view__section">
      <h3 class="section-title">Timezone Table</h3>
      <div class="timezone-table">
        <div
          v-for="tz in store.selectedTimezones"
          :key="tz"
          class="timezone-row"
        >
          <span class="timezone-name">{{ tz }}</span>
          <span class="timezone-time">{{ getTimeInTz(tz) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTimestampStore } from '../store'
import { useTimestamp } from '../composables/useTimestamp'
import { useClipboard } from '@shared/composables/useClipboard'

const store = useTimestampStore()
const { getSystemTimestamp, toTimestamp, toDate } = useTimestamp()
const { copy, copied } = useClipboard()

const currentTs = ref(Date.now())
const tsResult = ref<number | null>(null)
const dateResult = ref('')
const error = ref('')

let timer: ReturnType<typeof setInterval>

onMounted(async () => {
  await refreshTimestamp()
  timer = setInterval(() => {
    currentTs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})

async function refreshTimestamp() {
  currentTs.value = await getSystemTimestamp()
}

function copyTimestamp() {
  copy(String(currentTs.value))
}

async function convert() {
  error.value = ''
  const input = store.inputValue.trim()

  const num = Number(input)
  if (!isNaN(num) && num > 0) {
    tsResult.value = num
    dateResult.value = toDate(num)
    return
  }

  const ts = toTimestamp(input)
  if (ts !== null) {
    tsResult.value = ts
    dateResult.value = input
    return
  }

  error.value = 'Invalid input. Enter a timestamp (ms) or a date string.'
}

function getTimeInTz(tz: string): string {
  try {
    return new Date(currentTs.value).toLocaleString('en-US', {
      timeZone: tz,
      hour12: false,
    })
  } catch {
    return 'N/A'
  }
}
</script>

<style scoped>
.timestamp-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  height: 100%;
  overflow-y: auto;
}

.timestamp-view__section {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.timestamp-view__now {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.timestamp-value {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
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

.converter__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.converter__label {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 180px;
}

.converter__input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  outline: none;
}

.converter__input:focus {
  border-color: var(--color-accent);
}

.converter__result {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.result-item {
  display: flex;
  gap: var(--spacing-sm);
  font-size: 13px;
}

.result-label {
  color: var(--color-text-tertiary);
  min-width: 120px;
}

.result-value {
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.converter__error {
  margin-top: var(--spacing-sm);
  font-size: 13px;
  color: var(--color-error);
}

.timezone-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.timezone-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.timezone-row:nth-child(even) {
  background: var(--color-bg-secondary);
}

.timezone-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.timezone-time {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text-primary);
}
</style>
