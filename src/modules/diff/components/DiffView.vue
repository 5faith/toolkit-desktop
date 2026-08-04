<template>
  <div class="diff-view">
    <div class="diff-view__toolbar">
      <button class="action-btn" @click="computeDiff">Compare</button>
      <div class="diff-view__view-modes">
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.viewMode === 'side-by-side' }"
          @click="store.setViewMode('side-by-side')"
        >
          Side by Side
        </button>
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.viewMode === 'unified' }"
          @click="store.setViewMode('unified')"
        >
          Unified
        </button>
      </div>
    </div>

    <div class="diff-view__inputs">
      <div class="diff-view__input-panel">
        <div class="panel-header">Left (Original)</div>
        <CodeEditor v-model="store.leftText" placeholder="Paste original text..." />
      </div>
      <div class="diff-view__input-panel">
        <div class="panel-header">Right (Modified)</div>
        <CodeEditor v-model="store.rightText" placeholder="Paste modified text..." />
      </div>
    </div>

    <div v-if="lineDiff.length > 0" class="diff-view__result">
      <div class="panel-header">Diff Result</div>

      <div v-if="store.viewMode === 'side-by-side'" class="diff-side">
        <div class="diff-side__panel">
          <div class="diff-side__scroll">
            <div
              v-for="(line, i) in leftLines"
              :key="'l' + i"
              class="diff-line"
              :class="{ 'diff-line--removed': line.type === 'removed' }"
            >
              <pre class="diff-line__text">{{ line.text }}</pre>
            </div>
          </div>
        </div>
        <div class="diff-side__panel">
          <div class="diff-side__scroll">
            <div
              v-for="(line, i) in rightLines"
              :key="'r' + i"
              class="diff-line"
              :class="{ 'diff-line--added': line.type === 'added' }"
            >
              <pre class="diff-line__text">{{ line.text }}</pre>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="diff-unified">
        <div
          v-for="(change, index) in lineDiff"
          :key="index"
          class="diff-line"
          :class="{
            'diff-line--added': change.added,
            'diff-line--removed': change.removed,
          }"
        >
          <span class="diff-line__marker">{{ change.added ? '+' : change.removed ? '-' : ' ' }}</span>
          <pre class="diff-line__text">{{ change.value }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Change } from 'diff'
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useDiffStore } from '../store'
import { useDiff } from '../composables/useDiff'

const store = useDiffStore()
const { computeDiff: doCompute, computeLineDiff } = useDiff()

const lineDiff = ref<Change[]>([])

interface DiffLine {
  text: string
  type: 'added' | 'removed' | 'unchanged'
}

const leftLines = computed<DiffLine[]>(() => {
  const result: DiffLine[] = []
  for (const change of lineDiff.value) {
    const lines = change.value.split('\n')
    if (change.removed) {
      for (const line of lines) {
        result.push({ text: line, type: 'removed' })
      }
    } else if (!change.added) {
      for (const line of lines) {
        result.push({ text: line, type: 'unchanged' })
      }
    }
  }
  return result
})

const rightLines = computed<DiffLine[]>(() => {
  const result: DiffLine[] = []
  for (const change of lineDiff.value) {
    const lines = change.value.split('\n')
    if (change.added) {
      for (const line of lines) {
        result.push({ text: line, type: 'added' })
      }
    } else if (!change.removed) {
      for (const line of lines) {
        result.push({ text: line, type: 'unchanged' })
      }
    }
  }
  return result
})

function computeDiff() {
  doCompute()
  lineDiff.value = computeLineDiff()
}
</script>

<style scoped>
.diff-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.diff-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.diff-view__view-modes {
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

.mode-btn:hover {
  background: var(--color-bg-hover);
}

.mode-btn--active {
  background: var(--color-accent-light);
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

.diff-view__inputs {
  display: flex;
  flex: 0 0 30%;
  gap: 1px;
  background: var(--color-border);
  min-height: 80px;
}

.diff-view__input-panel {
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

.diff-view__result {
  flex: 1;
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.diff-side {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--color-border);
  min-height: 0;
}

.diff-side__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  min-height: 0;
}

.diff-side__scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.diff-unified {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.diff-line {
  display: flex;
  padding: 0 var(--spacing-sm);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}

.diff-line--added {
  background: #dcfce7;
  color: #166534;
}

.diff-line--removed {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme="dark"] .diff-line--added {
  background: #14532d;
  color: #86efac;
}

[data-theme="dark"] .diff-line--removed {
  background: #7f1d1d;
  color: #fca5a5;
}

.diff-line__marker {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
}

.diff-line__text {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
