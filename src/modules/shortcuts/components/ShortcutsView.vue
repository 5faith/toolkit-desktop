<template>
  <div class="shortcuts-view">
    <div class="shortcuts-view__header">
      <div>
        <h2 class="shortcuts-view__title">Keyboard Shortcuts</h2>
        <p class="shortcuts-view__desc">
          仅在本软件窗口前台时生效；标记为冲突的组合可能已被系统或其他软件占用。
        </p>
      </div>
      <div class="shortcuts-view__actions">
        <button class="shortcuts-reset-all" @click="store.checkSystemConflicts()">重新检测</button>
        <button class="shortcuts-reset-all" @click="onResetAll">全部重置</button>
      </div>
    </div>

    <div v-for="group in groupedRows" :key="group.name" class="shortcuts-section">
      <h3 class="shortcuts-section__title">{{ group.name }}</h3>
      <div class="shortcuts-list">
        <div v-for="row in group.rows" :key="row.id" class="shortcuts-row">
          <span class="shortcuts-row__desc">
            <span v-if="row.icon" class="shortcuts-row__icon">{{ row.icon }}</span>
            {{ row.label }}
          </span>

          <div class="shortcuts-row__right">
            <span
              v-if="row.systemConflict"
              class="shortcuts-badge shortcuts-badge--system"
              :title="row.systemConflict"
            >系统冲突</span>
            <span v-if="row.duplicate" class="shortcuts-badge shortcuts-badge--duplicate">重复</span>
            <span v-if="!row.shortcut" class="shortcuts-badge">未设置</span>

            <span v-if="recordingId === row.id" class="shortcuts-recording">按下快捷键…</span>
            <span v-else class="shortcuts-row__keys">
              <template v-if="row.shortcut">
                <kbd
                  v-for="part in row.shortcut.split('+')"
                  :key="part"
                  class="shortcuts-row__key"
                >{{ part }}</kbd>
              </template>
              <span v-else class="shortcuts-row__empty">—</span>
            </span>

            <div class="shortcuts-row__actions">
              <button class="shortcuts-action" @click="startRecording(row.id)">修改</button>
              <button class="shortcuts-action" :disabled="!row.shortcut" @click="onClear(row.id)">清除</button>
              <button class="shortcuts-action" :disabled="!row.modified" @click="onReset(row.id)">重置</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="shortcuts-view__hint">
      点击「修改」后按下组合键，Esc 取消；「清除」表示禁用该快捷键。
    </p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ShortcutsView' })

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useShortcutStore } from '@/stores/shortcuts'
import { setShortcutsSuspended } from '@shared/composables/useShortcuts'
import { shortcutFromEvent } from '@shared/utils/shortcut'

const store = useShortcutStore()
const recordingId = ref<string | null>(null)

const groupedRows = computed(() => {
  const groups = new Map<string, typeof store.rows>()
  for (const row of store.rows) {
    const rows = groups.get(row.group) ?? []
    rows.push(row)
    groups.set(row.group, rows)
  }
  return [...groups.entries()].map(([name, rows]) => ({ name, rows }))
})

onMounted(async () => {
  window.addEventListener('keydown', onRecordingKeydown, true)
  await store.initialize()
  await store.checkSystemConflicts()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onRecordingKeydown, true)
  stopRecording()
})

watch(
  () => store.rows.map(row => row.shortcut).join('|'),
  () => {
    void store.checkSystemConflicts()
  }
)

function startRecording(actionId: string) {
  recordingId.value = actionId
  setShortcutsSuspended(true)
}

function stopRecording() {
  recordingId.value = null
  setShortcutsSuspended(false)
}

function onRecordingKeydown(event: KeyboardEvent) {
  if (!recordingId.value) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  if (event.key === 'Escape') {
    stopRecording()
    return
  }

  const shortcut = shortcutFromEvent(event)
  if (!shortcut) return

  store.setShortcut(recordingId.value, shortcut)
  stopRecording()
}

function onClear(actionId: string) {
  store.clearShortcut(actionId)
}

function onReset(actionId: string) {
  store.resetShortcut(actionId)
}

function onResetAll() {
  store.resetAll()
}
</script>

<style scoped>
.shortcuts-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-xl);
  max-width: 760px;
  margin: 0 auto;
}

.shortcuts-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.shortcuts-view__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.shortcuts-view__desc {
  font-size: 13px;
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

.shortcuts-view__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.shortcuts-reset-all {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.shortcuts-reset-all:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.shortcuts-section {
  margin-bottom: var(--spacing-xl);
}

.shortcuts-section__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcuts-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 8px var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.shortcuts-row:hover {
  background: var(--color-bg-hover);
}

.shortcuts-row__desc {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 160px;
  font-size: 13px;
  color: var(--color-text-primary);
}

.shortcuts-row__icon {
  font-size: 14px;
}

.shortcuts-row__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.shortcuts-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
}

.shortcuts-badge--system {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
}

.shortcuts-badge--duplicate {
  background: color-mix(in srgb, var(--color-warning, #f59e0b) 14%, transparent);
  color: var(--color-warning, #b45309);
}

.shortcuts-row__keys {
  display: flex;
  gap: 4px;
}

.shortcuts-row__key {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  line-height: 1.4;
  white-space: nowrap;
}

.shortcuts-row__empty {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.shortcuts-recording {
  font-size: 12px;
  color: var(--color-accent);
  animation: shortcuts-pulse 1s ease-in-out infinite;
}

.shortcuts-row__actions {
  display: flex;
  gap: 4px;
}

.shortcuts-action {
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
  cursor: pointer;
}

.shortcuts-action:hover:not(:disabled) {
  background: var(--color-bg-primary);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.shortcuts-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.shortcuts-view__hint {
  margin-top: var(--spacing-lg);
  font-size: 12px;
  color: var(--color-text-tertiary);
}

@keyframes shortcuts-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
