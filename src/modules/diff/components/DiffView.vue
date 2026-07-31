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

    <div v-if="store.viewMode === 'side-by-side'" class="diff-view__inputs">
      <div class="diff-view__input-panel">
        <div class="panel-header">Left (Original)</div>
        <CodeEditor v-model="store.leftText" placeholder="Paste original text..." />
      </div>
      <div class="diff-view__input-panel">
        <div class="panel-header">Right (Modified)</div>
        <CodeEditor v-model="store.rightText" placeholder="Paste modified text..." />
      </div>
    </div>

    <div v-else class="diff-view__inputs">
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
      <div class="diff-output">
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
import { ref } from 'vue'
import type { Change } from 'diff'
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useDiffStore } from '../store'
import { useDiff } from '../composables/useDiff'

const store = useDiffStore()
const { computeDiff: doCompute, computeLineDiff } = useDiff()

const lineDiff = ref<Change[]>([])

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
  flex: 1;
  gap: 1px;
  background: var(--color-border);
  overflow: hidden;
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
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  max-height: 40%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.diff-output {
  overflow-y: auto;
  flex: 1;
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
